const fs = require("fs");
const path = require("path");

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
	fs.writeFileSync(file, JSON.stringify(obj, null, "\t"));
}

function bumpPatchVersion(pkgPath) {
	const pkg = readJson(pkgPath);
	const parts = (pkg.version || "0.0.0").split(".").map(n => parseInt(n || "0", 10));
	parts[2] = (isNaN(parts[2]) ? 0 : parts[2]) + 1;
	pkg.version = `${parts[0]}.${parts[1]}.${parts[2]}`;
	writeJson(pkgPath, pkg);
	return pkg.version;
}

const libraryPkgPath = path.resolve("package.json");
const newVersion = bumpPatchVersion(libraryPkgPath);
console.log(`Version bumped to ${newVersion}`);
