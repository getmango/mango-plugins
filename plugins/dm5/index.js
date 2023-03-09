var headers = {
	'Cookie': 'isAdult=1',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:79.0) Gecko/20100101 Firefox/79.0',
	'Referer': 'http://www.dm5.com/'
};

var cid;
var DM5 = {};

var currentPage = 1;
var digits = 0;

function listChapters(query) {
	var html = mango.get(query, headers).body;

	var title = /DM5_COMIC_MNAME\s*=\s*['"]([^"']+)['"]/.exec(html)[1];

	var chapterATags = mango.css(html, '#chapterlistload li > a');
	var chapters = [];

	chapterATags.forEach(function(node) {
		var href = mango.attribute(node, 'href');
		var id = /\/m([0-9]+)\//.exec(href)[1];
		var chapterTitle = mango.text(node);
		chapters.push({
			id: id,
			title: chapterTitle
		});
	});

	if (chapters.length === 0)
		mango.raise("Failed to list chapters");

	return JSON.stringify({
		chapters: chapters,
		title: title
	});
}

function reloadDM5() {
	var url = 'https://www.dm5.com/m' + cid + '/';

	var html = mango.get(url, headers).body;
	DM5 = {};

	// Parse chapter info
	// Adapted from https://github.com/kanasimi/work_crawler/blob/7a4bc8ede23f710928eec5253af70174561c0806/
	// 		comic.cmn-Hans-CN/dm5.js#L203-L230
	var params = /\sDM5_([a-zA-Z\d_]+)\s*=\s*(\d+|true|false|(["'])(?:\\.|[^\\"']+)*\3)/g;
	while (match = params.exec(html)) {
		var value = match[2];
		if (match[3] === "'") {
			value = value.replace(/^'([\s\S]*?)'$/g, function(all, inner) {
				return '"' + inner.replace(/"/g, '\\"') + '"';
			});
		}
		value = value.replace(/\t/g, '\\t');
		DM5[match[1]] = JSON.parse(value);
	}

	if (DM5.IMAGE_COUNT <= 0)
		mango.raise("This is a VIP chapter.");
}

function selectChapter(id) {
	cid = id
	reloadDM5();

	currentPage = 1;
	var pageCount = DM5.IMAGE_COUNT;
	digits = Math.floor(Math.log10(pageCount)) + 1;
	return JSON.stringify({
		title: DM5.CTITLE,
		pages: pageCount
	});
}

function nextPage() {
	if (currentPage > DM5.IMAGE_COUNT)
		return JSON.stringify({});

	var url = 'http://www.dm5.com/m' + cid + '/chapterfun.ashx?';
	url += query({
		cid: DM5.CID,
		page: currentPage,
		key: '',
		language: 1,
		gtk: 6,
		_cid: DM5.CID,
		_mid: DM5.MID,
		_dt: DM5.VIEWSIGN_DT,
		_sign: DM5.VIEWSIGN
	});
	var html = mango.get(url, headers).body;

	if (html === '') {
		// need to reload the DM5 object
		console.log('reloading DM5');
		reloadDM5();
		nextPage();
		return;
	}

	var imgAry = eval(html);
	var imgURL = imgAry[0];
	var filename = pad(currentPage, digits) + '.jpg'
	var pageHeaders = Object.assign(headers);
	pageHeaders['Referer'] = 'http://www.dm5.com/m' + cid;
	currentPage += 1;

	return JSON.stringify({
		url: imgURL,
		headers: pageHeaders,
		filename: filename
	});
}

// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function query(obj) {
	var parts = [];
	for (var key in obj) {
		if (!obj.hasOwnProperty(key))
			continue;

		var part = encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
		parts.push(part);
	}
	return parts.join('&');
}
