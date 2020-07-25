var chapter;
var currentPage;

function search(query) {
	var json = {};
	var URL = 'https://mangadex.org/api/manga/' + query;
	try {
		json = JSON.parse(mango.get(URL).body);
	} catch (e) {
		mango.raise('Failed to get JSON from ' + URL);
	}

	if (json.status !== 'OK')
		mango.raise('JSON status: ' + json.status);

	var chapters = [];
	Object.keys(json.chapter).forEach(function(id) {
		var obj = json.chapter[id];

		var groups = [];
		['group_name', 'group_name_2', 'group_name_3'].forEach(function(key) {
			if (obj[key]) {
				groups.push(obj[key]);
			}
		});
		groups = groups.join(', ');
		var time = new Date(obj.timestamp * 1000);

		var slimObj = {};
		slimObj['id'] = id;
		slimObj['volume'] = obj['volume'];
		slimObj['chapter'] = obj['chapter'];
		slimObj['title'] = obj['title'];
		slimObj['lang'] = obj['lang_code'];
		slimObj['groups'] = groups;
		slimObj['time'] = time;

		chapters.push(slimObj);
	});

	return JSON.stringify({
		title: json.manga.title,
		chapters: chapters
	});
}

function selectChapter(id) {
	var json = {};
	var URL = 'https://mangadex.org/api/chapter/' + id;
	try {
		json = JSON.parse(mango.get(URL).body);
	} catch (e) {
		mango.raise('Failed to get JSON from ' + URL);
	}

	if (json.status !== 'OK')
		mango.raise('JSON status: ' + json.status);

	chapter = json;
	currentPage = 0;

	var info = {
		title: json.title.trim() || ('Ch.' + json.chapter),
		pages: json.page_array.length
	};
	return JSON.stringify(info);
}

function nextPage() {
	if (currentPage >= chapter.page_array.length)
		return JSON.stringify({});

	var fn = chapter.page_array[currentPage];
	var info = {
		filename: fn,
		url: chapter.server + chapter.hash + '/' + fn
	};

	currentPage += 1;
	return JSON.stringify(info);
}
