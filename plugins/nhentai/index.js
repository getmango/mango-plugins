var pageURL;
var pageCount = 0;
var ended = false;
var digits = 0;
var imageType;
var totalPages;

// Nhentai IP address is mandatory to bypass the cloudflare protection (title API is protected by cloudflare)
const NHENTAI_API_BASE_URL = 'http://138.2.77.198:3002/api/gallery/';
// Only image API that exposes cover
const NHENTAI_COVER_SERVER_URL = 'https://t5.nhentai.net/galleries/';
// API that exposes images
const NHENTAI_IMAGE_SERVER_URL = "https://i.nhentai.net/galleries/";

function searchManga(query) {

	var mangas = []

	var regex = /\/g\/([a-zA-Z0-9]+)\//g

	var match = regex.exec(query)

	// Multiple URL query
	while (match != null){

		var mangaID = match[1]

		var response = mango.get(NHENTAI_API_BASE_URL + mangaID.toString()).body;

		var json = JSON.parse(response)

		var mangaTitle = json.title.english;
		var mediaID = json.media_id
		var coverType = convertType(json.images.cover.t)

		if (mangaTitle){

			mangas.push({
				id: mangaID,
				title: mangaTitle,
				cover_url: NHENTAI_COVER_SERVER_URL + mediaID + "/cover." + coverType 
			});

		}

		match = regex.exec(query)

	}

	return JSON.stringify(mangas)

}

function listChapters(mangaID) {

	const url = NHENTAI_API_BASE_URL + mangaID

	if (!url.match(/\/api\/gallery\/[0-9]+$/))
		mango.raise('Invalid API query url')

	var response = mango.get(url).body;

	var json = JSON.parse(response)

	var chapterTitle = json.title.english
	var chapterLenght = json.images.pages.length

	var chapters = [{
		id: mangaID,
		manga_title: 'nhentai',
		title: chapterTitle,
		pages: chapterLenght,
		volume: null,
                chapter: null,
                groups: null,
                language: null,
                tags: []
	}];

	return JSON.stringify(chapters);
}

function selectChapter(id) {
	var url = NHENTAI_API_BASE_URL + id;
	var response = mango.get(url).body;
	var json = JSON.parse(response)

	var chapterTitle = json.title.english;
	var mediaID = json.media_id
	var pagesNumber = json.images.pages.length

	var pageInfos = []
	for (var i = 1; i <= pagesNumber; i = i + 1 ){

		var page = json.images.pages[0]
		var pageType = convertType(page.t)
		pageInfos.push({mediaID: mediaID , index: i , pageType: pageType})

	}
	mango.storage('pageInfos', JSON.stringify(pageInfos))
	mango.storage('status', "0")

	return JSON.stringify({
		id: id,
		title: chapterTitle,
		manga_title: chapterTitle,
		pages: pagesNumber,
		volume: null,
		chapter: null,
		groups: null,
		language: null,
		tags: []
	});
}

function nextPage() {
	var status = parseInt(mango.storage('status'))
	var pageInfos = JSON.parse(mango.storage('pageInfos'))

	if (status >= pageInfos.length) {
		return JSON.stringify({});
	}

	var pageInfo = pageInfos[status]
	var url = NHENTAI_IMAGE_SERVER_URL + pageInfo.mediaID + '/' + pageInfo.index + '.' + pageInfo.pageType
	var filename = pageInfo.index + '.' + pageInfo.pageType

	status = status + 1
        mango.storage('status', JSON.stringify( status ))

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


// https://github.com/Zekfad/nhentai-api/blob/master/src/api.js
function convertType(type) {
	type = type.toLowerCase();
	switch (type) {
		case 'j':
		case 'jpg':
		case 'jpeg':
			type = 'jpg';
			break;
		case 'p':
		case 'png':
			type = 'png';
			break;
		case 'g':
		case 'gif':
			type = 'gif';
			break;
	}
	return type;
}
