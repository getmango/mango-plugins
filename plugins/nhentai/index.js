var pageURL;
var pageCount = 0;
var ended = false;
var digits = 0;
var imageType;
var totalPages;

const NHENTAI_BASE_URL = 'https://nhentai.net/g/';
const NHENTAI_IMAGE_URL = "https://i.nhentai.net/galleries/";


function listChapters(url) {
	var html = mango.get(url).body;

	var urlMatch = /\/g\/([a-zA-Z0-9]+)\//.exec(url);
	var chapterID = urlMatch[1];

	var chapterTitleNode = mango.css(html, '.title')[0];

	if (!chapterTitleNode)
		mango.raise("Failed to get gallery title");

	var chapterTitle = mango.text(chapterTitleNode);

	var chapters = [{
		id: chapterID,
		title: chapterTitle
	}];
	return JSON.stringify({
		chapters: chapters,
		title: 'nhentai'
	});
}

function selectChapter(id) {
	var url = NHENTAI_BASE_URL + id + '/';
	var html = mango.get(url).body;

	var chapterTitleNode = mango.css(html, '.title')[0];

	if (!chapterTitleNode) {
		mango.raise("Failed to get gallery title");
	}

	var chapterTitle = mango.text(chapterTitleNode);

	var pages = 0;
	try {
		var pagesSpan = mango.css(html, '#tags div:nth-last-child(2) span.name')[0];
		if (!pagesSpan) {
			throw new Error();
		}
		var lengthText = mango.text(pagesSpan);
		pages = parseInt(lengthText);
	} catch (e) {
		mango.raise("Failed to get page count");
	}

	var firstPageATag = mango.css(html, 'div#thumbnail-container img.lazyload')[0];
	if (!firstPageATag) {
		mango.raise("Failed to get URL to the first page");
	}

	uglyPageURL = mango.attribute(firstPageATag, 'data-src');
	var pageURLMatch = /\/galleries\/([0-9]+)\/.*?\.(\w*)/.exec(uglyPageURL);

	pageURL = NHENTAI_IMAGE_URL + pageURLMatch[1] + "/";
	imageType = pageURLMatch[2];

	ended = false;
	pageCount = 0;
	totalPages = pages;
	digits = Math.floor(Math.log10(pages)) + 1;

	return JSON.stringify({
		title: chapterTitle,
		pages: pages
	});
}

function nextPage() {
	if (ended) {
		return JSON.stringify({});
	}

	pageCount += 1;

	if (pageCount === totalPages) {
		ended = true;
	}

	var url, extension;
	var extensions = [imageType, 'png', 'jpg', 'gif', 'jpeg'];

	// Not all galleries have uniform file types
	// Post should return 405 if path exists, 404 otherwise.
	for (var i = 0; i < extensions.length; i++) {
		extension = extensions[i];
		url = pageURL + pageCount + "." +  extension;
		if (mango.post(url, "").status_code == 405) {
			// We got the right extension
			break;
		}
	}

	var filename = pad(pageCount, digits) + '.' + extension;

	return JSON.stringify({
		url: url,
		filename: filename
	});
}

// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
