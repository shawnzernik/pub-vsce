/******************************************************************************
 * build.js
 *
 * Packs this library and updates downstream package.json dependencies to use
 * a relative file: path to the generated .tgz (instead of an absolute path).
 *
 * Usage: run from the library directory (same as previous script).
 *
 *****************************************************************************/
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

function run(cmd, options = {}) {
	const result = childProcess.spawnSync(cmd, { shell: true, stdio: "pipe", ...options });
	const stdout = (result.stdout || "").toString();
	const stderr = (result.stderr || "").toString();

	if (result.error)
		throw result.error;

	if (typeof result.status === "number" && result.status !== 0)
		throw new Error(`Command failed (${result.status}): ${cmd}\n${stderr || stdout}`);

	return stdout.trim();
}

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
	fs.writeFileSync(file, JSON.stringify(obj, null, "\t") + "\n");
}

function bumpPatchVersion(pkgPath) {
	const pkg = readJson(pkgPath);
	const parts = (pkg.version || "0.0.0").split(".").map(n => parseInt(n || "0", 10));
	parts[2] = (isNaN(parts[2]) ? 0 : parts[2]) + 1;
	pkg.version = `${parts[0]}.${parts[1]}.${parts[2]}`;
	writeJson(pkgPath, pkg);
	return pkg.version;
}

function removeOldTarballs(dir, prefix) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (err) {
		return;
	}
	for (const e of entries) {
		if (!e.isFile()) continue;
		if (e.name.startsWith(prefix) && e.name.endsWith(".tgz")) {
			try {
				fs.unlinkSync(path.join(dir, e.name));
			} catch { }
		}
	}
}

function findNewestTarball(dir, prefix) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = entries
		.filter(e => e.isFile() && e.name.startsWith(prefix) && e.name.endsWith(".tgz"))
		.map(e => {
			const full = path.join(dir, e.name);
			const stat = fs.statSync(full);
			return { full, mtimeMs: stat.mtimeMs };
		})
		.sort((a, b) => b.mtimeMs - a.mtimeMs);

	if (files.length === 0)
		throw new Error(`No tarball found in ${dir} with prefix '${prefix}'.`);

	return files[0].full;
}

function updateDepToFile(pkgPath, depName, tarPath) {
	const pkg = readJson(pkgPath);
	pkg.dependencies = pkg.dependencies || {};

	// compute relative path from package.json's directory to the tarball
	const pkgDir = path.dirname(pkgPath);
	let rel = path.relative(pkgDir, tarPath);

	// Normalize Windows backslashes to forward slashes for npm
	rel = rel.replace(/\\/g, "/");

	// Ensure it is a relative path understood by npm (./ or ../)
	if (!rel.startsWith("."))
		rel = "./" + rel;

	pkg.dependencies[depName] = `file:${rel}`;
	writeJson(pkgPath, pkg);
}

// 1) Bump patch version of the library package.json
const libraryPkgPath = path.resolve("package.json");
const newVersion = bumpPatchVersion(libraryPkgPath);
console.log(`Version bumped to ${newVersion}`);

// 2) Ensure deps are installed and build the TypeScript
console.log("Running npm install...");
console.log(run("npm install"));
console.log("Building TypeScript...");
console.log(run("npx tsc -p tsconfig.json"));

// 3) Remove old packed tarballs (in parent dir)
const outDir = path.resolve("..");
const pkg = readJson(libraryPkgPath);
const tarPrefix = String(pkg.name || "")
	.replace(/^@/, "")
	.replace(/\//g, "-") + "-";
removeOldTarballs(outDir, tarPrefix);

// 4) Pack the library into parent dir
console.log("Packing library into parent directory...");
console.log(run("npm pack --pack-destination .."));

// 5) Locate newest tarball we just produced
const tarFile = findNewestTarball(outDir, tarPrefix);
console.log(`Produced tarball: ${tarFile}`);

// 6) Update downstream package.json files to point at the new tarball using a relative path
const extensionsPkg = path.resolve("../extensions/package.json");
const webviewsPkg = path.resolve("../webviews/package.json");

try {
	updateDepToFile(extensionsPkg, "@lvt/aici-library", tarFile);
	console.log(`Updated ${extensionsPkg} -> file:${path.relative(path.dirname(extensionsPkg), tarFile).replace(/\\/g, "/")}`);
} catch (err) {
	console.warn(`Warning: failed to update ${extensionsPkg}: ${err.message}`);
}

try {
	updateDepToFile(webviewsPkg, "@lvt/aici-library", tarFile);
	console.log(`Updated ${webviewsPkg} -> file:${path.relative(path.dirname(webviewsPkg), tarFile).replace(/\\/g, "/")}`);
} catch (err) {
	console.warn(`Warning: failed to update ${webviewsPkg}: ${err.message}`);
}

console.log("Done.");
