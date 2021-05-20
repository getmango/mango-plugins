var currentPage = 0;
var digits = 0;
var imgURLs;

const BASE_URL = "https://www.webtoons.com";
const MOBILE_URL = "https://m.webtoons.com";
const SEARCH_URL = "https://ac.webtoons.com/ac?q=en%5E";
const SEARCH_PARAMS = "&q_enc=UTF-8&st=1&r_format=json&r_enc=UTF-8";

const LIST_ENDPOINT = "/episodeList?titleNo=";
const PAGE_QUERY = "&page=";

function listChapters(query) {
	
	try {
		var searchResp = mango.get(SEARCH_URL + encodeURI(query) + SEARCH_PARAMS).body;
		var search = JSON.parse(searchResp);
		var mangaID = search["items"][0][0][3];
	} catch (error) {
		mango.raise("Could not find a webtoon with that title.");
	}

	if (!mangaID) mango.raise("Could not get webtoon ID.");

	try {
		var resp = mango.get(BASE_URL + LIST_ENDPOINT + mangaID);
		var urlLocation = resp.headers.Location;
	} catch (error) {
		mango.raise("Could not get webtoon page.");
	}
	
	chapters = [];
	var html = mango.get(MOBILE_URL + urlLocation, {
		'referer': MOBILE_URL
	}).body;

	if (!html) mango.raise("Failed to get chapter list.");

	var liChapters = mango.css(html, "ul#_episodeList li[id*=episode]")

	if (!liChapters) mango.raise("Failed to find chapters.");

	liChapters.forEach(function(chapter) {
		var url = mango.attribute(mango.css(chapter, "a")[0], 'href');
		
		var chapterIDRegex = /webtoons\.com\/\w{2}\/\w+\/(\w-?)+\/(.+)\//;
		var chapterIDMatch = chapterIDRegex.exec(url);
		
		var chapterID;
		try {
			chapterID = chapterIDMatch[2];
		} catch (error) {
			mango.raise("Failed to get a chapter ID.");
		}

		var subjectNode = mango.css(chapter, ".ellipsis")[0]
		var subject = mango.text(subjectNode);

		if (!subject) mango.raise("Failed to get a chapter name.")
		
		var numNode = mango.css(chapter, ".col.num");
		var num = mango.text(numNode[0]).substring(1);
		
		var dateNode = mango.css(chapter, ".date");
		var date = mango.text(dateNode[0]);
		date = date.replace("UP", ""); // Remove webtoons "UP" tag on latest chapter

		// Encode chapter in following format: idMANGAIDchCHAPTERIDnumNUM_NUM
		var chapterFullID = "id" + mangaID + "ch" + chapterID + "num" + num;
		chapterFullID = chapterFullID.replace(/\-/g, "_");

		if (!chapterFullID) mango.raise("Failed to generate chapter full ID.");

		slimObj = {}
		slimObj['id'] = chapterFullID;
		slimObj['title'] = subject;
		slimObj['#'] = num;
		slimObj['Date'] = date;
			
		chapters.push(slimObj);
	});
	
	try {
		var chapterTitleNode = mango.css(html, 'meta[property="og:title"]');
		var chapterTitle = mango.attribute(chapterTitleNode[0], "content");
	} catch (error) {
		mango.raise("Could not get title.");
	}
	
	return JSON.stringify({
		chapters: chapters,
		title: chapterTitle
	});
}

function selectChapter(id) {
	var mangaIDMatch = /id(\d+)ch(.+)num(\d+)/.exec(id);
	var mangaID = mangaIDMatch[1];
	var mangaChapterSlug = mangaIDMatch[2].replace(/\_/g, "-");
	var mangaChapterNum = mangaIDMatch[3].replace(/\_/g, ".");

	try {
		var resp = mango.get(BASE_URL + LIST_ENDPOINT + mangaID);
		var urlLocation = resp.headers.Location;
	} catch (error) {
		mango.raise("Could not get webtoon chapter list.");
	}

	var viewerURL = BASE_URL + urlLocation.replace(/list/, mangaChapterSlug + "/viewer") 
		+ "&episode_no=" + mangaChapterNum;

	var html = mango.get(viewerURL).body;

	if(!html) mango.raise("Failed to load chapter images.");

	var titleNode = mango.css(html, ".subj_info .subj_episode");
	
	// Chapters get saved as NUM - CHAPTERNAME.cbz
	// This is done since some webtoons have names like:
	//	`Episode 10` and `Season 2 Episode 10`, which 
	//	throws off the sorting.
	var chapterTitle = mangaChapterNum + " - " + mango.text(titleNode[0]);

	var imgList = mango.css(html, "#_imageList img");

	imgURLs = [];
	imgList.forEach(function(element) {
		imgURLs.push(
			mango.attribute(element, "data-url")
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
	
	var url = imgURLs[currentPage];
	var filename = pad(currentPage, digits) + '.' + /\.(\w{3})($|\?\w+)/.exec(url)[1];

	currentPage += 1;
	return JSON.stringify({
		url: url,
		filename: filename,
		headers: {
			'referer': BASE_URL + "/"
		}
	});
}

// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}