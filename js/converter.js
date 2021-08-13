const fs = require("fs");
const path = require("path");

const marked = require("marked");
const hljs = require("highlight.js");

const cheerio = require("cheerio");

marked.setOptions({
  gfm: true,
  smartLists: true,
  highlight: function (code, lang) {
    return hljs.highlight(code, { language: lang }).value;
  },
});

class ConvertFiles {
  navItems = {};
  appendNav = [];

  constructor(
    inputPath = "./md/",
    outputPath = "./docs/",
    templatePath = "./template/"
  ) {
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    this.templatePath = templatePath;

    this.fileList = this.listFiles(this.inputPath, [".md"]);

    this.start();
  }

  listFiles(dir, fileTypes) {
    let filesToReturn = [];

    //list files
    function walkDir(currentPath) {
      let files = fs.readdirSync(currentPath);

      for (let i in files) {
        let curFile = path.join(currentPath, files[i]);

        if (
          fs.statSync(curFile).isFile() &&
          (fileTypes != undefined && fileTypes.length > 0
            ? fileTypes.indexOf(path.extname(curFile)) != -1
            : true)
        ) {
          filesToReturn.push(curFile.replace(dir, ""));
        } else if (fs.statSync(curFile).isDirectory()) {
          walkDir(curFile);
        }
      }
    }
    walkDir(dir);

    //remove prefixed path
    for (let i = 0; i < filesToReturn.length; i++) {
      filesToReturn[i] = path.relative(dir, filesToReturn[i]);
    }

    return filesToReturn;
  }

  replaceExtension(filename, newExt) {
    return filename.replace(/\.\w+$/gi, newExt);
  }

  loadFile(filepath) {
    if (
      filepath != null &&
      filepath != undefined &&
      fs.existsSync(filepath) &&
      fs.statSync(filepath).isFile()
    ) {
      return fs
        .readFileSync(filepath, "utf8")
        .toString()
        .trim()
        .replace(/\r/g, "");
    }
    return "";
  }

  findJson(text) {
    let start = text.indexOf("{");
    if (start != -1 && start + 1 < text.length) start += 1;

    let stop = -1;

    if (start != -1) {
      let opened = 1;

      for (let i = start; i < text.length; i++) {
        const c = text.charAt(i);

        if (c == "{") opened++;
        else if (c == "}") opened--;

        if (opened == 0) {
          stop = i;
          break;
        }
      }

      return text.substring(start - 1, stop + 1 <= text.length ? stop + 1 : -1);
    }
    return "{}";
  }

  loadProps(filename) {
    const file = this.loadFile(path.join(this.inputPath, filename));

    let jsonStr = this.findJson(file);

    const data = file.replace(jsonStr, "").trim();

    let props = JSON.parse(jsonStr);
    props["file"] = filename;
    props["data"] = data;

    return props;
  }

  loadTemplate(filename) {
    filename = this.replaceExtension(filename, ".html");

    return this.loadFile(path.join(this.templatePath, filename));
  }

  saveOutput(filename, data) {
    const fullPath = path.join(this.outputPath, filename);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    fs.writeFileSync(fullPath, data);
  }

  generateContent(filename) {
    const props = this.loadProps(filename);

    if ("convert" in props && props["convert"]) {
      const template =
        "template" in props ? this.loadTemplate(props["template"]) : "";
      let dom = cheerio.load(template);

      const md = "data" in props ? marked(props["data"]) : "";

      let fileTitle = this.replaceExtension(props["file"], "");
      fileTitle = fileTitle[0]
        .toUpperCase()
        .concat(fileTitle.length > 1 ? fileTitle.substring(1) : "");

      const title = "title" in props ? props["title"] : fileTitle;
      const sitename = "sitename" in props ? " | " + props["sitename"] : "";

      dom("head").append("<title>" + title + sitename + "</title>");

      if (dom("body").find("header").length) {
        dom("header").append("<h1>" + title + "</h1>");
      } else {
        const headerElement = "<header><h1>" + title + "</h1></header>";
        const body = dom("body");

        if (body.find("nav").length) {
          dom("nav").after(headerElement);
        } else if (body.find("main").length) {
          dom("main").before(headerElement);
        } else if (body.find("footer").length) {
          dom("footer").before(headerElement);
        } else {
          dom("body").append(headerElement);
        }
      }

      if (dom("body").find("main").length) {
        dom("main").append(md);
      } else {
        const mainElement = "<main>" + md + "</main>";
        const body = dom("body");

        if (body.find("header").length) {
          dom("header").after(mainElement);
        } else if (body.find("nav").length) {
          dom("nav").after(mainElement);
        } else if (body.find("footer").length) {
          dom("footer").before(mainElement);
        } else {
          dom("body").append(mainElement);
        }
      }

      if ("headElements" in props) {
        props["headElements"].forEach((element) => {
          dom("head").append(element);
        });
      }

      const outputName = this.replaceExtension(props["file"], ".html");

      const inNav = "inNav" in props ? props["inNav"] : false;
      const hasNav = "hasNav" in props ? props["hasNav"] : false;

      if (inNav) this.navItems[title] = outputName;
      if (hasNav) this.appendNav.push(outputName);

      this.saveOutput(outputName, dom.html());
    }
  }

  generateNav() {
    let nav = cheerio.load("<ul></ul>", {}, false);

    for (const key in this.navItems) {
      const val = this.navItems[key].toString().trim().replace(/\\/g, "/");

      nav("ul").append("<li><a href='" + val + "'>" + key + "</a></li>");
    }

    return nav.html();
  }

  saveNav(filename, nav) {
    const file = this.loadFile(path.join(this.outputPath, filename));
    let dom = cheerio.load(file);

    if (dom("body").find("nav").length) {
      dom("nav").append(nav);
    } else {
      const navElement = "<nav>" + nav + "</nav>";
      const body = dom("body");

      if (body.find("header").length) {
        dom("header").before(navElement);
      } else if (body.find("main").length) {
        dom("main").before(navElement);
      } else if (body.find("footer").length) {
        dom("footer").before(navElement);
      } else {
        dom("body").append(navElement);
      }
    }

    this.saveOutput(filename, dom.html());
  }

  start() {
    this.fileList.forEach((filename) => {
      this.generateContent(filename);
    });

    const nav = this.generateNav();
    this.appendNav.forEach((filename) => {
      this.saveNav(filename, nav);
    });
  }
}

new ConvertFiles();
