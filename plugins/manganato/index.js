const SEARCH_URL = "https://manganato.com/search/story/";
const MAIN_URL = "https://chapmanganato.com/";
const ALT_URL = "https://manganato.com/";

function searchManga(query) {
    const res = mango.get(SEARCH_URL + query.replace(" ", "_"));
    if (res.status_code !== 200)
        mango.raise('Failed to search for manga. Status ' + res.status_code);
    const manga = mango.css(res.body, "div.search-story-item");

    return JSON.stringify(manga.map(function (m) {
        const ch = {
            id: mango.attribute(mango.css(m, "a.item-title")[0], "href").split("/").pop(),
            title: mango.text(mango.css(m, "a.item-title")[0]),
            cover_url: mango.attribute(mango.css(m, "img.img-loading")[0], "src")
        };
        return ch;
    }));
}

function getManga(id) {
    var res = mango.get(MAIN_URL + id);
    if (res.status_code !== 200)
        res = mango.get(ALT_URL + id);
    if (res.status_code !== 200)
        mango.raise('Failed to get item from ' + MAIN_URL + ' & ' + ALT_URL + '.');
    return res;
}

function listChapters(id) {
    const res = getManga(id);
    if (res.status_code !== 200)
        mango.raise('Failed to get chapters. Status ' + res.status_code);
    const mangaTitle = mango.text(mango.css(res.body, "div.story-info-right h1")[0]);
    const manga = mango.css(res.body, "div.panel-story-chapter-list li.a-h");

    return JSON.stringify(manga.map(function (m) {
        //const chapter = getManga(id + '/' + mango.attribute(mango.css(m, "a.chapter-name")[0], "href").split("/").pop());
        //const pages = mango.css(chapter.body, "div.container-chapter-reader img");

        const obj = {
            id: id + '/' + mango.attribute(mango.css(m, "a.chapter-name")[0], "href").split("/").pop(),
            title: mango.text(mango.css(m, "a.chapter-name")[0]),
            manga_title: mangaTitle,
            //pages: pages.length,
            pages: 0,
            chapter: mango.attribute(mango.css(m, "a.chapter-name")[0], "href").split("-").pop(),
            language: "en",
            group_id: id,
            published_at: Date.parse(parseTime(mango.css(m, "span.chapter-time")[0]))
        };
        return obj;
    }));
}

function parseTime(time) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = mango.attribute(time, "title");
    const month = date.split(" ")[0];
    const day = date.split(" ")[1].split(",")[0];
    const year = date.split(" ")[1].split(",")[1];
    return year + "-" + months.indexOf(month) + "-" + day;
}

function selectChapter(id) {
    var mangaId = id.split("/")[0].toString();
    const manga = getManga(mangaId);
    if (manga.status_code !== 200)
        mango.raise('Failed to get the manger.');
    const mangaTitle = mango.text(mango.css(manga.body, "div.story-info-right h1")[0]);
    const chapters = mango.css(manga.body, "div.panel-story-chapter-list li.a-h");

    const chapter = getManga(id);
    if (chapter.status_code !== 200)
        mango.raise('Failed to get chapter. Status ' + res.status_code);
    const imageUrls = mango.css(chapter.body, "div.container-chapter-reader img").map(function (img) {
        return mango.attribute(img, "src");
    });
    mango.storage("manga-image-data", JSON.stringify(imageUrls));
    mango.storage("manga-title", mangaTitle);
    mango.storage("page", "0");

    const obj = chapters.map(function (c) {
        return obj = {
            id: mangaId + "/" + mango.attribute(mango.css(c, "a.chapter-name")[0], "href").split("/").pop(),
            title: mangaTitle + " - " + mango.text(mango.css(c, "a.chapter-name")[0]),
            manga_title: mangaTitle,
            pages: imageUrls.length,
            chapter: id.split("-").pop(),
            language: "en",
            group_id: mangaId,
            published_at: Date.parse(parseTime(mango.css(c, "span.chapter-time")[0]))
        };
    });

    return JSON.stringify(obj.filter(function (f) {
        return f.id == id;
    }).pop());
}

function nextPage() {
    const page = parseInt(mango.storage("page"));
    const urls = JSON.parse(mango.storage("manga-image-data"));
    const filename = page + '.jpg';
    if (page >= urls.length) return JSON.stringify({});

    const len = urls.length.toString().length;
    const pageNum = Array(Math.max(len - String(page + 1).length + 1, 0)).join(0) + (page + 1);
    const finalFilename = pageNum + '.' + filename.split('.').pop();
    mango.storage('page', (page + 1).toString());

    return JSON.stringify({
        url: urls[page],
        filename: finalFilename,
        headers: {
            authority: 'v13.mkklcdnv6tempv4.com',
            accept: 'image/avif,image/webp,image/apng,image/svg+xml,image',
            pragma: 'no-cache',
            referer: 'https://chapmanganato.com/'
        }
    });
}
