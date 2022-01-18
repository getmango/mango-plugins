var currentPage = 0;
var digits = 0;
var imgURLs;

const ROOT_URL = "https://catmanga.org/";

// Helper function. Builds the API URL since there are no ES6 template strings.
function buildApiEndpoint(buildID, mangaID, chapterNum) {
	return ROOT_URL + "_next/data/" + buildID
	+ "/series/" + mangaID + "/" + chapterNum + ".json";
}

function listChapters(query) {	
	// Get API data (stored in a <script> tag in the index html)
	// We can't use the API directly, since that means already 
	//	knowing the correct buildID.
	//
	// URL in format https://catmanga.org/_next/data/{BUILD-ID}/{ENDPOINT}.json
	
	var indexHTML = mango.get(ROOT_URL).body
	if (!indexHTML) {
		mango.raise("Failed to get index.")
	}

	var APINode = mango.css(indexHTML, "script#__NEXT_DATA__")[0];

	if (!APINode) {
		mango.raise("Failed to get series data.")
	}
	
	var indexJSONString = mango.text(APINode);

	if (!indexJSONString) {
		mango.raise("An error occured when searching.");
	}

	var indexJSON = JSON.parse(indexJSONString);
	var allSeries = indexJSON["props"]["pageProps"]["series"];

	// Search all manga on site to find something that matches query.
	//	We have to do it manually since Catmanga has no searching.
	var manga;
	allSeries.forEach(function(element) {
		if (fuzzySearch(query, element["title"]) || fuzzySearch(query, element["series_id"])) {
			manga = element;
		} else {
			element["alt_titles"].forEach(function(title) {
				if (fuzzySearch(query, title)) {
					manga = element;
				}
			});
		}
	});
	
	if (!manga) {
		mango.raise("Failed to find manga with title: " + query);
	}

	var mangaTitle = manga["title"];

	if (!mangaTitle) {
		mango.raise("Failed to get title of manga.");
	}

	var chapters = [];
	manga["chapters"].forEach(function(chapter) {
		var seriesID = manga["series_id"].replace(/\-/, "_");
		var chapterNum = chapter["number"].toString().replace(/\./, "d");
		var chapterGroups = chapter["groups"].join(", ")
		
		var slimObj = {};
		slimObj["id"] = seriesID + "ch" + chapterNum
		slimObj["title"] = "Chapter " + chapter["number"];
		slimObj["groups"] = chapterGroups;

		chapters.push(slimObj);
	});

	return JSON.stringify({
		chapters: chapters.reverse(), // Catmanga sorts chapters oldest -> newest
		title: mangaTitle
	});
}

function selectChapter(id) {
	// Get buildID for chapter	
	var mangaIDMatch = /(.*?)ch((\dd?)*)$/.exec(id);
	var mangaID = mangaIDMatch[1].replace(/\_/, "-"); // Convert '_' back to '-'
	var mangaChapterNumber = mangaIDMatch[2].replace(/d/, "."); // Convert chxx(d)xx back to '.'

	var chapterReaderURL = ROOT_URL + "series/" + mangaID + "/" + mangaChapterNumber;
	var chapterHTML = mango.get(chapterReaderURL).body;

	if (!chapterHTML) {
		mango.raise("Failed to load chapter HTML.");
	}

	var APINode = mango.css(chapterHTML, "script#__NEXT_DATA__")[0];

	if (!APINode) {
		mango.raise("Failed to get chapter buildID.")
	}

	var buildIDJSONString = mango.text(APINode);
	var buildIDJSON = JSON.parse(buildIDJSONString);

	var buildID = buildIDJSON["buildId"];

	// Get manga images from API
	var mangaURL = buildApiEndpoint(buildID, mangaID, mangaChapterNumber);
	var mangaJSONString = mango.get(mangaURL).body;

	if (!mangaJSONString) {
		mango.raise("Failed to load chapter.");
	}

	var mangaJSON = JSON.parse(mangaJSONString);
	
	var chapterTitle = "Chapter " + mangaJSON["pageProps"]["chapter"]["number"];

	if (!chapterTitle) {
		mango.raise("Failed to get chapter title.");
	}

	imgURLs = mangaJSON["pageProps"]["pages"];
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
			'referer': "https://catmanga.org"
		}
	});
}

function fuzzySearch(query, trueString) {
	return trueString.toLowerCase()
		.indexOf(query.toLowerCase()) !== -1;
}


// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}