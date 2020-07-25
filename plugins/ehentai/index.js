var headers = {
	'Cookie': 'nw=1'
};

var pageURL;
var pageCount = 0;
var ended = false;
var digits = 0;

function search(url) {
	var html = mango.get(url, headers).body;

	var urlMatch = /\/g\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/.exec(url);
	var chapterID = urlMatch[1] + '_' + urlMatch[2];

	var chapterTitleNode = mango.css(html, '#gn')[0];

	if (!chapterTitleNode)
		mango.raise("Failed to get gallery title");

	var chapterTitle = mango.text(chapterTitleNode);

	var chapters = [{
		id: chapterID,
		title: chapterTitle
	}];
	return JSON.stringify({
		chapters: chapters,
		title: 'E-Hentai'
	});
}

function selectChapter(id) {
	var ary = id.split('_');
	if (ary.length !== 2)
		mango.raise("Incorrect ID " + id);

	var url = 'https://e-hentai.org/g/' + ary[0] + '/' + ary[1];
	var html = mango.get(url, headers).body;

	var chapterTitleNode = mango.css(html, '#gn')[0];

	if (!chapterTitleNode)
		mango.raise("Failed to get gallery title");

	var chapterTitle = mango.text(chapterTitleNode);

	var pages = 0;
	try {
		var lengthRow = mango.css(html, '#gdd tr:nth-last-child(2)')[0];
		if (!lengthRow)
			throw new Error
		var lengthText = mango.text(lengthRow);
		pages = parseInt(/([0-9]+)/.exec(lengthText)[1]);
	} catch {
		mango.raise("Failed to get page count");
	}

	var firstPageATag = mango.css(html, '#gdt .gdtm a:first-child')[0];
	if (!firstPageATag)
		mango.raise("Failed to get URL to the first page");

	pageURL = mango.attribute(firstPageATag, 'href');

	ended = false;
	pageCount = 0;
	digits = Math.floor(Math.log10(pages)) + 1;

	return JSON.stringify({
		title: chapterTitle,
		pages: pages
	});
}

function nextPage() {
	if (ended)
		return JSON.stringify({});

	pageCount += 1;

	var html = mango.get(pageURL, headers).body;

	var aTag = mango.css(html, '#i3 a')[0];
	if (!aTag)
		mango.raise("Failed to get URL to the next page");

	var nextPageURL = mango.attribute(aTag, 'href');

	if (nextPageURL === pageURL)
		ended = true;

	pageURL = nextPageURL;

	var imgTag = mango.css(aTag, 'img')[0];
	if (!imgTag)
		mango.raise("Failed to get image URL");

	var url = mango.attribute(imgTag, 'src');
	var filename = pad(pageCount, digits) + '.jpg'

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
