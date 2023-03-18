const BASE_URL = 'https://www.mangabz.com'
var downloadingChapter = {};

// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function searchManga(query) {
	const searchUrl = BASE_URL + '/search?title=' + encodeURIComponent(query);
	var mangaElements = [];
	for (var page = 1; page < 3; ++page) {
		const res = mango.get(searchUrl + '&page=' + page);
		if (res.status_code !== 200)
			mango.raise('Failed to search for manga. Status ' + res.status_code);
		mangaElements = mangaElements.concat(mango.css(res.body, '.mh-list > li'));
	}
	return JSON.stringify(mangaElements.map(function (m) {
		const url = mango.attribute(mango.css(m, 'a')[0], 'href');
		const title = mango.text(mango.css(m, 'h2')[0]);
		const desc = mango.text(mango.css(m, '.chapter')[0]).trim().replace(/\s+/g, ' ');
		const thumbnailUrl = mango.attribute(mango.css(m, 'img')[0], 'src');
		return {
			id: url.substring(1, url.length - 1),
			title: title,
			description: desc,
			cover_url: thumbnailUrl
		}
	}));
}

function _listChapters(mangaId) {
	const res = mango.get(BASE_URL + '/' + mangaId + '/');
	if (res.status_code !== 200)
		mango.raise('Failed to list chapters. Status ' + res.status_code);
	const mangaTitle = mango.text(mango.css(res.body, '.detail-info-title')[0]).trim();
	const chapters = mango.css(res.body, '#chapterlistload > a');
	return chapters.map(function (m) {
		const url = mango.attribute(m, 'href');
		const title = mango.text(m).trim().replace(/\s+/g, ' ');
		const pageReg = title.match(/（(\d+)P）/);
		const volumeOrChapter = title.match(/(\d+)(話|卷)/);
		var ch = {
			id: url.substring(1, url.length - 1),
			title: title,
			pages: 0,
			manga_title: mangaTitle,
			chapter: 0,
			volume: 0
		};
		if (pageReg != null) {
			ch.title = title.substring(0, pageReg.index).trim();
			ch.pages = parseInt(pageReg[1]);
		}
		if (volumeOrChapter != null) {
			const n = parseInt(volumeOrChapter[1]);
			if (volumeOrChapter[2] == '話')
				ch.chapter = n;
			else
				ch.volume = n;
		}
		return ch;
	});
}

function listChapters(mangaId) {
	return JSON.stringify(_listChapters(mangaId));
}

function selectChapter(id) {
	const res = mango.get(BASE_URL + '/' + id + '/');
	if (res.status_code !== 200)
		mango.raise('Failed to select chapter. Status ' + res.status_code);
	const mangaKeywords = mango.css(res.body, 'meta[name="Keywords"]')[0];
	const mangaTitle = mangaKeywords.match(/content="([^,]+)/)[1];
	const bottomPage = mango.text(mango.css(res.body, '.bottom-page2')[0]);
	const pageReg = bottomPage.match(/[^\d]+(\d+)/);
	downloadingChapter.id = id;
	downloadingChapter.manga_title = mangaTitle;
	downloadingChapter.title = mango.text(mango.css(res.body, '.top-title')[0]).trim();
	downloadingChapter.pages = pageReg == null ? 0 : parseInt(pageReg[1]);
	downloadingChapter.digits = Math.floor(Math.log10(downloadingChapter.pages)) + 1,
		downloadingChapter.curPage = 1;
	downloadingChapter.pageCache = [];
	return JSON.stringify(downloadingChapter);
}

function nextPage() {
	const page = downloadingChapter.curPage;
	if (page > downloadingChapter.pages)
		return JSON.stringify({});
	if (downloadingChapter.pageCache.length < page) {
		const id = downloadingChapter.id;
		const headers = {
			'referer': BASE_URL + '/' + id + '/'
		}
		const res = mango.get(BASE_URL + '/' + id + '/chapterimage.ashx?cid=' + id.substring(1) + '&page=' + page, headers);
		if (res.status_code !== 200)
			mango.raise('Failed to get page ' + page + '. Status ' + res.status_code);
		downloadingChapter.pageCache = downloadingChapter.pageCache.concat(eval(res.body));
	}
	const filename = pad(page, downloadingChapter.digits) + '.jpg';
	downloadingChapter.curPage++;
	return JSON.stringify({
		url: downloadingChapter.pageCache[page - 1],
		filename: filename,
		headers: {
			'referer': BASE_URL
		}
	});
}

function newChapters(mangaId, after) {
	var chapters = _listChapters(mangaId).map(function (ch) {
		ch['idNum'] = parseInt(ch.id.substring(1));
		return ch;
	});
	chapters.sort(function (a, b) {
		return b.idNum - a.idNum;
	});
	var lastCheck = mango.storage('lastCheck') || '{}';
	lastCheck = JSON.parse(lastCheck);
	var lastCheckIdNum = lastCheck[mangaId] || 0;
	if (lastCheckIdNum == 0 && chapters.length > 0)
		lastCheckIdNum = chapters[0].idNum;
	if (chapters.length > 0)
		lastCheck[mangaId] = chapters[0].idNum;
	mango.storage('lastCheck', JSON.stringify(lastCheck));
	var index = 0;
	for (; index < chapters.length; ++index)
		if (lastCheckIdNum >= chapters[index].idNum)
			break;
	return JSON.stringify(chapters.slice(0, index));
}
