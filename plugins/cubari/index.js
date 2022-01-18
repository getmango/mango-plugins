var currentPage = 0;
var digits = 0;
var imgURLs;

const API_URL = "https://cubari.moe/read/api/";

function listChapters(query) {	
	var cubariURLMatch = /\/read\/(\w+)\/(.+?)\//.exec(query);

	if (!cubariURLMatch) {
		manga.raise("Invalid Cubari URL.");
	}
	
	if (cubariURLMatch[1] != "gist" && cubariURLMatch[1] != "imgur") {
		manga.raise("Invalid Cubari URL.");
	}
	
	var cubariType = cubariURLMatch[1]; // "imgur" or "gist"
	var mangaSlug = cubariURLMatch[2];
	var mangaURL = API_URL + cubariType + "/series/" + mangaSlug + "/";

	var mangaJSONString = mango.get(mangaURL).body;

	if (!mangaJSONString) {
		mango.raise("Failed to get JSON data.");
	}

	var manga = JSON.parse(mangaJSONString);
	
	if (!manga) {
		mango.raise("Failed to get manga");
	}

	var mangaTitle = manga["title"];

	if (!mangaTitle) {
		mango.raise("Failed to get title of manga.");
	}

	var chapters = [];
	var chapterIndexAsArray = Object.keys(manga["chapters"]); // Since manga.chapters is an obj.
	chapterIndexAsArray.forEach(function(index) {
		const chapter = manga["chapters"][index];
		
		var chapterID = cubariType + "___" + mangaSlug.replace(/\-/, "_") 
			+ "___" + index.toString().replace(/\./, "_");
		var chapterTitle = chapter["title"];
		
		var slimObj = {};
		slimObj["id"] = chapterID;
		slimObj["title"] = chapterTitle;

		chapters.push(slimObj);
	});

	return JSON.stringify({
		chapters: chapters.reverse(), // Cubari sorts chapters oldest -> newest
		title: cubariType == "imgur" ? "cubari" : mangaTitle
	});
}

function selectChapter(id) {
	var mangaIDMatch = /(gist|imgur)_{3}(.+?)_{3}(.+)$/.exec(id);
	var cubariType = mangaIDMatch[1];
	var mangaSlug = mangaIDMatch[2].replace(/\_/, "-"); // Convert '_' back to '-'
	var chapterNum = mangaIDMatch[3].replace(/\_/, "."); // Convert '_' back to '.'

	var chapterTitle = cubariType == "imgur" ? "imgur-" + mangaSlug : "Chapter " + chapterNum;

	var proxySlug = mangaSlug;

	if (cubariType == "gist") {
		var mangaURL = API_URL + cubariType + "/series/" + mangaSlug + "/";
		var mangaJSONString = mango.get(mangaURL).body;
	
		if (!mangaJSONString) {
			mango.raise("Failed to get JSON data.");
		}
	
		var manga = JSON.parse(mangaJSONString);
		
		if (!manga) {
			mango.raise("Failed to get manga");
		}

		var groups = manga["chapters"][chapterNum]["groups"];
		var groupFirstKey = Object.keys(groups)[0]; // Get first (and most likely only) group url.
		var proxyURL = groups[groupFirstKey];

		var mangaURLMatch = /chapter\/(.+?)\//.exec(proxyURL);
		
		if (!mangaURLMatch) {
			mango.raise("Failed to get chapter image URL.");
		}
		
		proxySlug = mangaURLMatch[1];
	}

	chapterURL = API_URL + "imgur/chapter/" + proxySlug + "/";
	
	var proxyJSONString = mango.get(chapterURL).body;

	if (!proxyJSONString) {
		mango.raise("Failed to get proxy JSON data.");
	}

	var proxyJSON = JSON.parse(proxyJSONString);

	imgURLs = [];
	var chapterIndexAsArray = Object.keys(proxyJSON);
	chapterIndexAsArray.forEach(function(index) {
		imgURLs.push(proxyJSON[index]["src"]);
	});

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
	var filename = pad(currentPage, digits) + '.' + /\.(\w+)(\?.*)?$/.exec(url)[0];

	currentPage += 1;
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