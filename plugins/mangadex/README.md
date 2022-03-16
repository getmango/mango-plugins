# MangaDex Plugin

This is the official Mango plugin for [MangaDex](https://mangadex.org/).

If you are looking for the v1 version of this plugin (deprecated), check out commit f045ecd5752823f100baf4f298d89f2f99237cd4.

### Configuration

Under the `settings` field in `info.json`, you can customize the following values:

#### `language`

You can list one or more language codes in this field (separated by commas) for the plugin to search MangaDex in. Only chapters in one of the specified languages will be shown and used. Check [here](https://api.mangadex.org/docs.html#section/Language-Codes-and-Localization) for the list of available language codes. When it's not set, the plugin will show you chapters in all languages, and you probably don't want that.

#### `listChapterLimit`

This field controls the maximum number of chapters the plugin lists when browsing a manga or when checking for updates. It can be anything between `1` and `500`. Unset it to use the default value `100` from MangaDex.

Maintained by [@hkalexling](https://github.com/hkalexling).
