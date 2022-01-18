var pageURL;
var pageCount = 0;
var ended = false;
var digits = 0;
var firstpageURl;
var baseURL = 'http://www.wnacg.org';

function listChapters(url) {
	var html = mango.get(url).body;

	var urlMatch = /aid-([0-9]+)\.html/.exec(url);
	
	var chapterID = urlMatch[1];

	var chapterTitleNode = mango.css(html, 'h2')[0];

	if (!chapterTitleNode)
		mango.raise("Failed to get the title");

	var chapterTitle = mango.text(chapterTitleNode);

	var chapters = [{
		id: chapterID,
		title: chapterTitle
	}];
	
	return JSON.stringify({
		chapters: chapters,
		title: 'wnacg'
	});
}

function selectChapter(id) {
	var url = baseURL+'/photos-index-aid-' + id + '.html';
	
	var html = mango.get(url).body;

	var chapterTitleNode = mango.css(html, 'h2')[0];

	if (!chapterTitleNode)
		mango.raise("Failed to get the title");

	var chapterTitle = mango.text(chapterTitleNode);

	var pages = 0;
	try {
		var lengthRow = mango.css(html, '.asTB div.asTBcell.uwconn')[0];
		if (!lengthRow)
			throw new Error
		var lengthText = mango.text(lengthRow);
		pages = parseInt(/([0-9]+)/.exec(lengthText)[1]);
	} catch (e) {
		mango.raise("Failed to get the page count");
	}

	var firstPageATag = mango.css(html, 'div.pic_box.tb a:first-child')[0];
	if (!firstPageATag)
		mango.raise("Failed to get the URL of the first page");

	pageURL = baseURL + mango.attribute(firstPageATag, 'href');
	
	firstpageURL=pageURL;

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

	var html = mango.get(pageURL).body;

	var aTag = mango.css(html, '#photo_body a')[0];
	if (!aTag)
		mango.raise("Failed to get the URL of the next page");

	var nextPageURL = baseURL + mango.attribute(aTag, 'href');

	if (nextPageURL === firstpageURL)
		ended = true;

	pageURL = nextPageURL;

	var imgTag = mango.css(aTag, 'img')[0];
	if (!imgTag)
		mango.raise("Failed to get the image URL");

	var url = 'http:' + mango.attribute(imgTag, 'src');
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
