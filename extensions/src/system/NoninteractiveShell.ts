import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { StringBuffer } from "@lvt/aici-library/dist/StringBuffer";
import * as process from "process";

export class NoninteractiveShell {
	public error = false;
	public output: string = "";
	public code: number = Number.MAX_VALUE;

	/**
	 * Execute a shell command non-interactively and collect stdout/stderr.
	 * Resolves with a NoninteractiveShell summary object when the process
	 * closes or if an immediate spawn error occurs.
	 */
	public static async execute(command: string, options?: SpawnOptionsWithoutStdio | undefined): Promise<NoninteractiveShell> {
		return new Promise((resolve) => {
			const buffer = new StringBuffer();
			const ret = new NoninteractiveShell();

			const optionsWithFilteredEnv = { ...(options || {}) };
			optionsWithFilteredEnv.env = { ...process.env, ...(optionsWithFilteredEnv.env || {}) };
			delete optionsWithFilteredEnv.env['NODE_OPTIONS'];
			delete optionsWithFilteredEnv.env['NODE_DEBUG'];
			delete optionsWithFilteredEnv.env['NODE_INSPECT'];

			const cleanCommand = command.replace(/\b--inspect(-brk)?(=[^\s]*)?/g, "").trim();

			let childProcess;
			try {
				childProcess = spawn(cleanCommand, { shell: true, ...optionsWithFilteredEnv });
			} catch (err: any) {
				// Immediate spawn failure (e.g. ENOENT)
				ret.error = true;
				buffer.appendLine(String(err?.message ?? err));
				ret.output = buffer.toString();
				ret.code = -1;
				resolve(ret);
				return;
			}

			// stdout
			childProcess.stdout.on("data", (data: Buffer) => {
				buffer.append(data.toString());
			});

			// stderr
			childProcess.stderr.on("data", (data: Buffer) => {
				buffer.append(data.toString());
				ret.error = true;
			});

			// process closed
			childProcess.on("close", (code: number) => {
				ret.code = (typeof code === "number") ? code : Number.MAX_VALUE;
				ret.error = ret.error || ret.code !== 0;
				ret.output = buffer.toString();
				resolve(ret);
			});

			// process error
			childProcess.on("error", (err: Error) => {
				ret.error = true;
				buffer.appendLine(err.message);
				ret.output = buffer.toString();
				ret.code = -1;
				resolve(ret);
			});

			// Ensure stdin is closed so commands that expect EOF can finish.
			try {
				childProcess.stdin.end();
			} catch {
				// ignore write/close errors on stdin
			}
		});
	}
}
