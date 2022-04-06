function getCoverURL(mangaId, coverId) {
	const res = mango.get('https://api.mangadex.org/cover/' + coverId);
	if (res.status_code !== 200)
		mango.raise('Failed to cover ID. Status ' + res.status_code);
	const filename = JSON.parse(res.body).data.attributes.fileName;
	return 'https://uploads.mangadex.org/covers/' + mangaId + '/' + filename;
}

function getManga(mangaId) {
	const res = mango.get('https://api.mangadex.org/manga/' + mangaId);
	if (res.status_code !== 200)
		mango.raise('Failed to get manga. Status ' + res.status_code);
	return JSON.parse(res.body).data;
}

function formatChapter(json, mangaTitle) {
	var title = json.attributes.title || "";
	if (json.attributes.volume)
		title += ' Vol. ' + json.attributes.volume;
	if (json.attributes.chapter)
		title += ' Ch. ' + json.attributes.chapter;
	var groupId;
	for (i = 0; i < json.relationships.length; i++) {
		const obj = json.relationships[i];
		if (obj.type === 'scanlation_group') {
			groupId = obj.id;
			break;
		}
	}
	const obj = {
		id: json.id,
		title: title,
		manga_title: mangaTitle,
		pages: json.attributes.pages,
		volume: json.attributes.volume,
		chapter: json.attributes.chapter,
		language: json.attributes.translatedLanguage,
		group_id: groupId || null,
		published_at: Date.parse(json.attributes.publishAt),
	};
	return obj;
}

function formatTimestamp(timestamp) {
	return new Date(timestamp).toISOString().replace('.000Z', '');
}

function searchManga(query) {
	const res = mango.get('https://api.mangadex.org/manga?title=' + encodeURIComponent(query));
	if (res.status_code !== 200)
		mango.raise('Failed to search for manga. Status ' + res.status_code);
	const manga = JSON.parse(res.body).data;
	if (!manga)
		mango.raise('Failed to search for manga.');

	return JSON.stringify(manga.map(function(m) {
		const titleAttr = m.attributes.title;
		const ch = {
			id: m.id,
			title: titleAttr.en || titleAttr['ja-ro'] || titleAttr[Object.keys(titleAttr)[0]]
		};
		for (i = 0; i < m.relationships.length; i++) {
			const obj = m.relationships[i];
			if (obj.type === 'cover_art') {
				ch.cover_url = getCoverURL(m.id, obj.id);
				break;
			}
		}
		return ch;
	}));
}

function listChapters(id) {
	const manga = getManga(id);
	const titleAttr = manga.attributes.title;
	const title = titleAttr.en || titleAttr['ja-ro'] || titleAttr[Object.keys(titleAttr)[0]];

	var url = 'https://api.mangadex.org/manga/' + id + '/feed?';

	const langStr = mango.settings('language');
	if (langStr) {
		const langAry = langStr.split(',').forEach(function(lang) {
			url += 'translatedLanguage[]=' + lang.trim() + '&';
		});
	}

	const limit = mango.settings('listChapterLimit');
	if (limit) {
		url += 'limit=' + limit.trim() + '&';
	}

	const res = mango.get(url);
	if (res.status_code !== 200)
		mango.raise('Failed to list chapters. Status ' + res.status_code);

	const chapters = JSON.parse(res.body).data;

	return JSON.stringify(chapters.map(function(ch) {
		return formatChapter(ch, title);
	}));
}

function newChapters(mangaId, after) {
	var url = 'https://api.mangadex.org/manga/' + mangaId + '/feed?publishAtSince=' + formatTimestamp(after) + '&';

	const langStr = mango.settings('language');
	if (langStr) {
		const langAry = langStr.split(',').forEach(function(lang) {
			url += 'translatedLanguage[]=' + lang.trim() + '&';
		});
	}

	const limit = mango.settings('listChapterLimit');
	if (limit) {
		url += 'limit=' + limit.trim() + '&';
	}

	const res = mango.get(url);
	if (res.status_code !== 200)
		mango.raise('Failed to list new chapters. Status ' + res.status_code);

	const chapters = JSON.parse(res.body).data;

	const manga = getManga(mangaId);
	const titleAttr = manga.attributes.title;
	const title = titleAttr.en || titleAttr['ja-ro'] || titleAttr[Object.keys(titleAttr)[0]];

	return JSON.stringify(chapters.map(function(ch) {
		return formatChapter(ch, title);
	}));
}

function selectChapter(id) {
	const res = mango.get('https://api.mangadex.org/chapter/' + id);
	if (res.status_code !== 200)
		mango.raise('Failed to get chapter. Status ' + res.status_code);

	const chapter = JSON.parse(res.body).data;
	var mangaId;
	for (i = 0; i < chapter.relationships.length; i++) {
		const obj = chapter.relationships[i];
		if (obj.type === 'manga') {
			mangaId = obj.id;
			break;
		}
	}

	if (!mangaId)
		mango.raise('Failed to get Manga ID from chapter');

	const manga = getManga(mangaId);
	const titleAttr = manga.attributes.title;
	const title = titleAttr.en || titleAttr['ja-ro'] || titleAttr[Object.keys(titleAttr)[0]];

	const atHome = mango.get('https://api.mangadex.org/at-home/server/' + id);
	if (atHome.status_code !== 200)
		mango.raise('Failed to get at-home server. Status ' + atHome.status_code);

	const atHomeData = JSON.parse(atHome.body);

	mango.storage('atHomeData', JSON.stringify(atHomeData));
	mango.storage('page', '0');

	return JSON.stringify(formatChapter(chapter, title));
}

function nextPage() {
	const page = parseInt(mango.storage('page'));
	const atHome = JSON.parse(mango.storage('atHomeData'));
	const filename = atHome.chapter.data[page]
	mango.storage('page', (page + 1).toString());
	if (!filename) return JSON.stringify({});

	return JSON.stringify({
		url: atHome.baseUrl + '/data/' + atHome.chapter.hash + '/' + filename,
		filename: filename,
	});
}
