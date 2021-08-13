# MarkdownConverter

Generate HTML from Markdown with Javascript and [Marked](https://marked.js.org).

Inserting the generated HTML into templates.

## Javascript

In the [js folder](/js) is the HTML from Markdown generator.

### Dependencies

- fs & path for file operations like reading and writing
- [marked](https://www.npmjs.com/package/marked) for generating HTML from Markdown
- [highlight.js](https://www.npmjs.com/package/highlight.js) for highlighting of code blocks
- [cheerio](https://www.npmjs.com/package/cheerio) for putting together templates and generated HTML

## Markdown File Structure

Markdown files are read from the [md folder](/md).

- JSON for HTML generation
  - Needed
    - `convert` - boolean: if this file should be converted to html
  - Optional
    - `inNav` - boolean: if the generated file should be listed in the navigation
    - `hasNav` - boolean: if the generated navigation should be included in the generated HTML of this file
    - `template` - string: name of the HTML document in the *templates* directory with file extension
    - `title` - string: title of this page
    - `sitename` - string: name of the site or page
    - `headElements` - list of strings: html elements in strings to be placed into the head of the generated HTML document
- Markdown to be converted

### Example

```json
{
    "convert": true,
    "inNav": true,
    "hasNav": false,
    "template": "html-file.html",
    "title": "Title",
    "sitename": "Site or Page Name",
    "headElements": [
      "<script src='js/main.js'></script>"
    ]
}
```

```md
# Markdown
```

### Generated HTML

HTML files are created into the [docs folder](/docs)
