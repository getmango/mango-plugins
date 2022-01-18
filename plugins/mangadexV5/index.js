var chapter;
var currentPage;

function listChapters(query) {
	var mangaJson = {};
	var json = {};

	var mangaURL = 'https://api.mangadex.org/manga/' + query;

	try {
		mangaJson = JSON.parse(mango.get(mangaURL).body);
	} catch (e) {
		mango.raise('Failed to get JSON from ' + URL);
	}

	if (mangaJson.result !== 'ok')
		mango.raise('JSON status: ' + mangaJson.result);

	var URL = 'https://api.mangadex.org/manga/' + query + '/feed';

	try {
		json = JSON.parse(mango.get(URL).body);
	} catch (e) {
		mango.raise('Failed to get JSON from ' + URL);
	}

	if (json.result !== 'ok')
		mango.raise('JSON status: ' + json.result);

	var chapters = [];
	Object.keys(json.data).forEach(function(id) {
		var obj = json.data[id];

		var time = new Date(obj['attributes']['createdAt']);

		var slimObj = {};
		slimObj['id'] = obj['id'].replace(/\-/g, "_");
		slimObj['volume'] = obj['attributes']['volume'];
		slimObj['chapter'] = obj['attributes']['chapter'];
		slimObj['title'] = 'v' + obj['attributes']['volume'] + ' c' + obj['attributes']['chapter'] + ' - ' + obj['attributes']['title'];
		slimObj['lang'] = obj['attributes']['translatedLanguage'];
		slimObj['groups'] = null;
		slimObj['time'] = time;

		chapters.push(slimObj);
	});

	return JSON.stringify({
		title: mangaJson['data']['attributes']['title']['en'],
		chapters: chapters
	});
}

function selectChapter(id) {
	id = id.replace(/\_/g, "-");
	var json = {};
	var URL = 'https://api.mangadex.org/chapter/' + id;

	try {
		json = JSON.parse(mango.get(URL).body);
	} catch (e) {
		mango.raise('Failed to get JSON from ' + URL);
	}

	if (json.result !== 'ok')
		mango.raise('JSON status: ' + json.result);

	chapter = json;
	currentPage = 0;

	var info = {
		title: 'v' + json['data']['attributes']['volume'] + ' c' + json['data']['attributes']['chapter'] + ' - ' + json['data']['attributes']['title'].trim(),
		pages: json['data']['attributes']['pages']
	};
	return JSON.stringify(info);
}

function nextPage() {
	var URL = 'https://api.mangadex.org/at-home/server/' + chapter.data.id;

	if (currentPage >= chapter['data']['attributes']['pages'])
		return JSON.stringify({});

	try {
		json = JSON.parse(mango.get(URL).body);
	} catch (e) {
		mango.raise('Failed to get JSON from ' + URL);
	}

	if (json.result !== 'ok')
		mango.raise('JSON status: ' + json.result);

	var fn = json['chapter']['data'][currentPage];
	var info = {
		filename: fn,
		url: json['baseUrl'] + '/data/' + json['chapter']['hash'] + '/' + fn
	};

	currentPage += 1;
	return JSON.stringify(info);
}
