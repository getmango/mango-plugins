// Nhentai IP address is mandatory to bypass the cloudflare protection (title API is protected by cloudflare)
const NHENTAI_INFO_API_BASE_URL = 'http://138.2.77.198:3002/api/gallery/';
const NHENTAI_SEARCH_API_BASE_URL = 'http://138.2.77.198:3002/api/galleries/search?query='
// Only image API that exposes cover
const NHENTAI_COVER_SERVER_URL = 'https://t5.nhentai.net/galleries/';
// API that exposes images
const NHENTAI_IMAGE_CDN_BASE_URL = "https://i.nhentai.net/galleries/";

/*
* Perform a search on nhentai by sauce ID and text query
*/
function searchManga(query) {

	const mangas = []
	const regex = /\/g\/([a-zA-Z0-9]+)\//g

	// Sauce ID query

    var match = regex.exec(query)

	while (match != null){

		const mangaID = match[1]

		const response = mango.get(NHENTAI_INFO_API_BASE_URL + mangaID.toString()).body;
        const json = JSON.parse(response)

		const mangaTitle = json.title.english;
		const mediaID = json.media_id
		const coverType = convertType(json.images.cover.t)

		if (mangaTitle){

			mangas.push({
				id: mangaID,
				title: mangaTitle,
				cover_url: NHENTAI_COVER_SERVER_URL + mediaID + "/cover." + coverType 
			});

		}

		match = regex.exec(query)

	}

	// Text query

	const response = mango.get(NHENTAI_SEARCH_API_BASE_URL + encodeURI(query)).body
	const json = JSON.parse(response)

	if (!json.error){

		const resultQuantity = json.result.length

		for (var i = 0; i < resultQuantity; i+=1){

			const result = json.result[i]

			const coverType = convertType(result.images.cover.t)

			mangas.push({
	                        id: result.id.toString(),
	                        title: result.title.english,
                        	cover_url: NHENTAI_COVER_SERVER_URL + result.mediaID + "/cover." + coverType
                	})
		}
	}

	return JSON.stringify(mangas)

}

/*
* List all chapter given a sauce ID (should always return one chapter since it's how nhentai works)
*/
function listChapters(mangaID) {

	const url = NHENTAI_INFO_API_BASE_URL + mangaID

	if (!url.match(/\/api\/gallery\/[0-9]+$/))
		mango.raise('Invalid API query url')

    const response = mango.get(url).body;
	const json = JSON.parse(response);

	const chapterTitle = json.title.english;
	const chapterLenght = json.images.pages.length;

	const chapters = [{
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

/*
* Used when a chapter is selected for download, preload download link in plugins storage and return chapter infos
*/
function selectChapter(id) {

	const url = NHENTAI_INFO_API_BASE_URL + id;

	if (!url.match(/\/api\/gallery\/[0-9]+$/))
        mango.raise('Invalid API query url')

	const response = mango.get(url).body;
	const json = JSON.parse(response);

	const chapterTitle = json.title.english;
	const mediaID = json.media_id;
	const chapterLenght = json.images.pages.length;

	const pageInfos = [];
	for (var i = 1; i <= chapterLenght; i = i + 1 ){

		const page = json.images.pages[0];
		const pageType = convertType(page.t);
		pageInfos.push({mediaID: mediaID , index: i , pageType: pageType})

	}
	mango.storage('pageInfos', JSON.stringify(pageInfos))
	mango.storage('status', "0")

	return JSON.stringify({
		id: id,
		title: chapterTitle,
		manga_title: chapterTitle,
		pages: chapterLenght,
		volume: null,
		chapter: null,
		groups: null,
		language: null,
		tags: []
	});
}

/*
* Navigate through the page url list and return url to mango
*/
function nextPage() {
	var status = parseInt(mango.storage('status'))
	const pageInfos = JSON.parse(mango.storage('pageInfos'));

	if (status >= pageInfos.length) {
		return JSON.stringify({});
	}

	const pageInfo = pageInfos[status];
	const url = NHENTAI_IMAGE_CDN_BASE_URL + pageInfo.mediaID + '/' + pageInfo.index + '.' + pageInfo.pageType;
	const filename = pageInfo.index + '.' + pageInfo.pageType;

	status = status + 1
        mango.storage('status', JSON.stringify( status ))

	return JSON.stringify({
		url: url,
		filename: filename
	});
}
/*
* Convert nhentai API image type to file extensions
* https://github.com/Zekfad/nhentai-api/blob/master/src/api.js
*/
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
