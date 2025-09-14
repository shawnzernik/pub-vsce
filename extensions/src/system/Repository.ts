import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { NoninteractiveShell } from "../system/NoninteractiveShell";
import { Config } from "../config";
import { Dictionary } from "@lvt/aici-library/dist/Dictionary";

export class Repository {
	public root: string;
	private cachedConfig: Config | undefined;
	private regexCache: Dictionary<RegExp> = {};

	private static async getRoot(target: string): Promise<string> {
		let dir = path.dirname(target);
		try {
			const stat = fs.statSync(target);
			if (stat.isDirectory())
				dir = target;
		} catch {
			// ignore; default to dirname(target)
		}

		const nis = await NoninteractiveShell.execute(
			"git rev-parse --show-toplevel",
			{ cwd: dir }
		);

		if (nis.error || nis.code !== 0)
			throw new Error(nis.output?.trim() || `Failed to find Git repository from '${dir}'.`);

		return nis.output.trim();
	}

	public static async instance(target: vscode.Uri): Promise<Repository> {
		const root = await this.getRoot(target.fsPath);
		return new Repository(root, target);
	}

	private scope: vscode.Uri;
	private constructor(root: string, scope: vscode.Uri) {
		this.scope = scope;
		try {
			// store the canonical filesystem path in `root`
			this.root = fs.realpathSync(root);
		} catch {
			this.root = path.resolve(root);
		}
	}

	public async list(target: string): Promise<string[]> {
		const fullPath = path.resolve(this.makeAbsolute(target));
		if (!this.isChild(fullPath))
			throw new Error(`File '${target}' is not within repository '${this.root}'!`);

		const stat = fs.statSync(fullPath);
		if (stat.isDirectory())
			return this.listDirectory(fullPath);
		if (stat.isFile())
			return this.listFile(fullPath);

		throw new Error(`Path '${fullPath}' is neither a directory nor file!`);
	}

	private async listDirectory(fullDirPath: string): Promise<string[]> {
		if (await this.isGitIgnored(fullDirPath) || await this.isRegexIgnored(fullDirPath))
			return [];

		const entries = fs.readdirSync(fullDirPath, { encoding: "utf8" });
		const collected: string[] = [];
		for (const entry of entries) {
			const child = path.join(fullDirPath, entry);
			const items = await this.list(child);
			collected.push(...items);
		}
		return collected;
	}

	private async listFile(fullFilePath: string): Promise<string[]> {
		if (await this.isGitIgnored(fullFilePath))
			return [];
		if (await this.isRegexIgnored(fullFilePath))
			return [];
		if (!this.isUtf8(fullFilePath))
			return [];
		return [this.makeRelative(fullFilePath)];
	}

	public isChild(fullPath: string): boolean {
		let absReal = "";
		try {
			absReal = fs.realpathSync(fullPath);
		} catch {
			absReal = path.resolve(fullPath);
		}

		const rel = path.relative(this.root, absReal);
		if (!rel)
			return true;

		return !rel.startsWith("..") && !path.isAbsolute(rel);
	}

	private async isRegexIgnored(fullPath: string): Promise<boolean> {
		const config = await this.getConfig();
		for (const regexStr of config.ignoreRegex) {
			if (!this.regexCache[regexStr]) {
				try {
					this.regexCache[regexStr] = new RegExp(regexStr);
				} catch {
					// If a regex fails to compile, skip it rather than failing overall
					continue;
				}
			}

			const re = this.regexCache[regexStr];
			if (re.test(fullPath))
				return true;
		}

		return false;
	}

	private async isGitIgnored(fullPath: string): Promise<boolean> {
		const escaped = fullPath.replace(/"/g, '\\"');
		const nis = await NoninteractiveShell.execute(
			`git check-ignore -q "${escaped}"`,
			{ cwd: this.root }
		);

		if (nis.code === 0)
			return true;

		if (nis.code === 1)
			return false;

		throw new Error(nis.output?.trim() || `git check-ignore failed for '${fullPath}'.`);
	}

	private isUtf8(fullPath: string): boolean {
		try {
			const buf = fs.readFileSync(fullPath);
			const dec = new TextDecoder("utf-8", { fatal: true });
			dec.decode(buf);
			return true;
		} catch {
			return false;
		}
	}

	private async getConfig(): Promise<Config> {
		if (!this.cachedConfig)
			this.cachedConfig = await Config.create(this.scope);
		return this.cachedConfig!;
	}

	public makeAbsolute(original: string): string {
		// Reject legacy "~/" usage to force caller updates
		if (original.startsWith("~/")) {
			throw new Error("Legacy '~/...' paths are not supported. Use relative repo paths instead.");
		}

		// absolute
		if (path.isAbsolute(original))
			return path.resolve(original);

		// relative to repository root (most common)
		return path.resolve(this.root, original);
	}

	public makeRelative(original: string): string {
		// Disallow legacy "~/"
		if (original.startsWith("~/")) {
			throw new Error("Legacy '~/...' paths are not supported. Use relative repo paths instead.");
		}

		let abs = original;
		if (!path.isAbsolute(original))
			abs = path.resolve(this.root, original);

		if (!this.isChild(abs))
			throw new Error(`Path '${original}' is not within repository '${this.root}'.`);

		const rel = path.relative(this.root, abs);
		if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
			return rel;
		}

		const wf = vscode.workspace.getWorkspaceFolder(this.scope);
		const workspaceRoot = wf ? wf.uri.fsPath : undefined;
		if (workspaceRoot) {
			const relToWs = path.relative(workspaceRoot, abs);
			if (!relToWs.startsWith("..") && !path.isAbsolute(relToWs)) {
				return relToWs;
			}
		}

		throw new Error(`Path '${original}' is not within repository or workspace root.`);
	}

	public read(relativeOrAbsolute: string): string {
		const abs = this.makeAbsolute(relativeOrAbsolute);
		if (!this.isChild(abs))
			throw new Error(`Path '${relativeOrAbsolute}' is not within repository '${this.root}'.`);
		const buf = fs.readFileSync(abs);
		const dec = new TextDecoder("utf-8");
		return dec.decode(buf);
	}

	public write(relativeOrAbsolute: string, contents: string | null): void {
		const abs = this.makeAbsolute(relativeOrAbsolute);
		if (!this.isChild(abs))
			throw new Error(`Path '${relativeOrAbsolute}' is not within repository '${this.root}'.`);

		try {
			const dir = path.dirname(abs);
			fs.mkdirSync(dir, { recursive: true });
		} catch {
		}

		if (contents === null) {
			try {
				fs.unlinkSync(abs);
			} catch (err: any) {
				if (err && err.code !== "ENOENT") throw err;
			}
			return;
		}

		fs.writeFileSync(abs, contents, { encoding: "utf8" });
	}

	public move(fromPath: string, toPath: string): void {
		const absFrom = this.makeAbsolute(fromPath);
		const absTo = this.makeAbsolute(toPath);

		if (!this.isChild(absFrom) || !this.isChild(absTo))
			throw new Error(`Move refused: source or destination outside repository root.`);

		try {
			fs.mkdirSync(path.dirname(absTo), { recursive: true });
		} catch { }

		try {
			fs.renameSync(absFrom, absTo);
			return;
		} catch (err: any) {
			if (err && err.code === "EXDEV") {
				const stat = fs.statSync(absFrom);
				if (stat.isDirectory()) {
					const cp: any = (fs as any).cpSync;
					if (typeof cp === "function") {
						cp(absFrom, absTo, { recursive: true });
					} else {
						this.copyDirRecursive(absFrom, absTo);
					}
					fs.rmSync(absFrom, { recursive: true, force: true });
				} else {
					fs.copyFileSync(absFrom, absTo);
					fs.unlinkSync(absFrom);
				}
				return;
			}
			throw err;
		}
	}

	private copyDirRecursive(src: string, dst: string): void {
		fs.mkdirSync(dst, { recursive: true });
		const entries = fs.readdirSync(src, { withFileTypes: true });
		for (const e of entries) {
			const s = path.join(src, e.name);
			const d = path.join(dst, e.name);
			if (e.isDirectory()) {
				this.copyDirRecursive(s, d);
			} else if (e.isFile()) {
				fs.copyFileSync(s, d);
			}
		}
	}
}
