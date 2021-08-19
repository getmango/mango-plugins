var currentPage = 0;
var digits = 0;
var imgURLs;

const SEARCH_URL = "https://readmanganato.com/getstorysearchjson";
const MAIN_URL = "https://readmanganato.com/";

function listChapters(query) {
        var search = mango.post(SEARCH_URL, "searchword=" + query, {
                "content-type" : "application/x-www-form-urlencoded"
        }).body;

        if (!search) {
                mango.raise("An error occured when searching.");
        }


        var mangaURL = JSON.parse(search)[0].link_story;
        var mangaID = /manga-(\w+)/.exec(mangaURL)[1];

        var html = mango.get(mangaURL).body;

        if(!html) {
                mango.raise("Failed to find manga.");
        }

        var mangaTitleNode = mango.css(html, "div.story-info-right h1")[0];

        if (!mangaTitleNode) {
                mango.raise("Failed to get chapter title.");
        }

        var mangaTitle = mango.text(mangaTitleNode);

        var chapters = [];
        mango.css(html, "ul.row-content-chapter li").forEach(function (element) {
                var linkNode   = mango.css(element, "a.chapter-name")[0];
                var uploadNode = mango.css(element, "span.chapter-time")[0];

                var mangaChapterNumber;
                try {
                        var url = mango.attribute(linkNode, "href");

			// Extract yyy(.yy) from: https://readmanganato.com/manga-xxxxx/chapter-yyy(.yy)
                        mangaChapterNumber = /chapter-((\d+.?)*)/.exec(url)[1];

                        // Replace '.' with '_', since ids can't contain '.'
                        mangaChapterNumber = mangaChapterNumber.replace(/\./, "_");
                } catch (e) {
                        mango.raise("Failed to get chapter number.");
                }

                var chapterID = mangaID + "chapter" + mangaChapterNumber  // Create ID as xxxxxxxxchapteryyy(_yy)
                var chapterTitle = mango.text(linkNode);
                var chapterUploadedTime = mango.attribute(uploadNode, "title");

                var slimObj = {};
                slimObj['id'] = chapterID;
                slimObj['title'] = chapterTitle;
                slimObj['time-uploaded'] = chapterUploadedTime;
                chapters.push(slimObj);
        });

        return JSON.stringify({
                chapters: chapters,
                title: mangaTitle
        });
}

function selectChapter(id) {
        var mangaIDMatch = /(.*?)chapter((\d_?)*)/.exec(id); // Extract xxxxxxxx & yyy(_yy) from ID.
        var mangaID = mangaIDMatch[1];
        var mangaChapterNumber = mangaIDMatch[2].replace(/\_/, "."); // Convert '_' back to '.'

        // Create URL formatted like https://readmanganato.com/manga-xxxxxxxx/chapter-yyy.yy
        var mangaURL = MAIN_URL + "manga-" + mangaID + "/chapter-" + mangaChapterNumber;

        var html = mango.get(mangaURL).body;

        if(!html) {
                mango.raise("Failed to load chapter.");
        }

        var chapterTitleNode = mango.css(html, "div.panel-breadcrumb a:last-child")[0];

        if (!chapterTitleNode) {
                mango.raise("Failed to get chapter title.")
        }

        var chapterTitle = mango.text(chapterTitleNode);

        var imageNodes = mango.css(html, "div.container-chapter-reader img");

        if (!imageNodes) {
                mango.raise("Failed to get images.")
        }

        imgURLs = [];
        imageNodes.forEach(function(element) {
                imgURLs.push(
                        mango.attribute(element, "src")
                );
        })

        currentPage = 0;
        digits = Math.floor(Math.log10(imgURLs.length)) + 1;

        return JSON.stringify({
                title: chapterTitle,
                pages: imgURLs.length
        });
}

function nextPage() {
        if (currentPage >= imgURLs.length) {
                return JSON.stringify({});
        }

        var url = imgURLs[currentPage]
        var filename = pad(currentPage, digits) + '.' + /\.(\w+)$/.exec(url)[0];

        currentPage += 1;
        return JSON.stringify({
                url: url,
                filename: filename,
                headers: {
                        'referer': "https://manganelo.com/"
                }
        });
}


// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
