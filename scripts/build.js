const sass = require("sass");
const fs = require("node:fs");
const path = require("node:path");

function log(...args) {
  console.log(...args);
}
function err(...args) {
  console.error(...args);
}

function compileSass(sassFilepath) {
  return sass.compile(sassFilepath, {
    importers: [
      {
        canonicalize(url, context) {
          if (path.extname(url) !== ".yaml") return null;
          log(`\t${url}`);
          return new URL(
            `stylesettings:${path.resolve(path.dirname(sassFilepath), url)}`,
          );
        },
        load(canonicalUrl) {
          const yamlData = fs.readFileSync(canonicalUrl.pathname);
          return {
            contents: `/* @settings\n${yamlData}*/`,
            syntax: "scss",
          };
        },
      },
    ],
  });
}

function build(srcDirpath, dstDirpath, relativeDirpath = "") {
  if (!srcDirpath || !dstDirpath) {
    throw new Error(
      `Source and destination paths should be defined: ${JSON.stringify({
        srcDirpath,
        dstDirpath,
      })}`,
    );
  }
  const currentSrcDirpath = path.join(srcDirpath, relativeDirpath);

  fs.readdir(currentSrcDirpath, { withFileTypes: true }, (error, dirents) => {
    if (error) {
      err("Error reading directory:", currentSrcDirpath, error);
      return;
    }
    dirents.forEach((dirent) => {
      if (dirent.isDirectory()) {
        build(srcDirpath, dstDirpath, path.join(relativeDirpath, dirent.name));
      } else if (
        path.extname(dirent.name) === ".scss" &&
        !dirent.name.startsWith("_")
      ) {
        const sassFilepath = path.join(
          srcDirpath,
          relativeDirpath,
          dirent.name,
        );
        log(sassFilepath);
        const compiledData = compileSass(sassFilepath);
        fs.mkdirSync(path.join(dstDirpath, relativeDirpath), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(
            dstDirpath,
            relativeDirpath,
            `${path.basename(dirent.name, ".scss")}.css`,
          ),
          compiledData.css,
        );
      }
    });
  });
}

const [_, __, src, dst] = process.argv;

log(`Building "${src}" into "${dst}"...\n`);

try {
  build(src, dst);
} catch (e) {
  if (e instanceof Error) {
    err(e.message);
  } else {
    throw e;
  }
}
