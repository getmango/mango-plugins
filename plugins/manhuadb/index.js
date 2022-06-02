function searchManga(query) {
	var mangas = [];
	const res = mango.get('https://www.manhuadb.com/search?q=' + encodeURIComponent(query));
	if (res.status_code !== 200)
		mango.raise('Failed to search for manga. Status ' + res.status_code);
	var html = res.body;
	items = mango.css(html, '.comicbook-index');
	for (i = 0; i < items.length; i++) {
		var href = mango.attribute(mango.css(items[i], 'a')[0], 'href');
		var img_link = mango.attribute(mango.css(items[i], 'img')[0], 'src');
        if (img_link.substring(0, 4) != 'http') {
            img_link = 'https://www.manhuadb.com' + img_link;
        }
		var authors = [];
		var authors_name = mango.css(items[i], '.one-line.comic-author>a')
		for (j = 0; j < authors_name.length; j++) {
			authors.push(mango.attribute(authors_name[j], 'title'))
		}
		mangas.push({
			id: href.substring(8, href.length),
			title: mango.attribute(mango.css(items[i], 'a')[0], 'title'),
			authors: authors,
			cover_url: img_link
		});
	}

	return JSON.stringify(mangas);
}

function listChapters(id) {
	var url = 'https://www.manhuadb.com/manhua/' + id;
	const res = mango.get(url);
	var chapters = []
	if (res.status_code !== 200)
		mango.raise('Failed to list chapters. Status ' + res.status_code);
	var html = res.body;
	var comic_lists = mango.css(html, '.links-of-books');
	for (i = 0; i < comic_lists.length; i++) {
		var comics = mango.css(comic_lists[i], 'a');
		for (j = 0; j < comics.length; j++) {
			var id_part = mango.attribute(comics[j], 'href');
			id_part2 = id_part.replace('/manhua/' + id + '/', '');
			chapters.push({
				id: id + '__' + id_part2.substring(0, id_part2.length - 5),
				title: mango.attribute(comics[j], 'title'),
				pages: 1000,
				manga_title: mango.text(mango.css(html, 'h1')[0])
			})
		}
	}
	return JSON.stringify(chapters);
}

function selectChapter(id) {
	var ids = id.split('__');
	var url = 'https://www.manhuadb.com/manhua/' + ids[0] + '/' + ids[1] + '.html';
	const res = mango.get(url);
	if (res.status_code !== 200)
		mango.raise('Failed to get chapter. Status ' + res.status_code);
	var html = res.body;
	var info = mango.css(html, '.breadcrumb-item');
	var title = mango.text(mango.css(info[info.length - 1], 'a')[0]);
	var page_num = parseInt(mango.text(info[info.length - 1]).split(' ')[5]);
	var manga_title = mango.text(mango.css(info[info.length - 2], 'a')[0]);
	mango.storage('url', 'https://www.manhuadb.com/manhua/' + ids[0] + '/' + ids[1] + '_p1.html');
	mango.storage('page', '0');

	return JSON.stringify({
		id: id,
		title: title,
		pages: page_num,
		manga_title: manga_title
	});
}

function nextPage() {
	const page = parseInt(mango.storage('page'));
	const url = mango.storage('url');
	const filename = page + '.jpg';
	const res = mango.get(url);
	if (res.status_code !== 200)
		mango.raise('Failed to get chapter. Status ' + res.status_code);
	var html = res.body;
	var css = mango.css(html, '.show-pic');
	if (css.length == 0) return JSON.stringify({});
	var img_url = mango.attribute(css[0], 'src');
	mango.storage('page', (page + 1).toString());
	mango.storage('url', url.replace('_p' + (page + 1).toString(), '_p' + (page + 2).toString()));
	return JSON.stringify({
		url: img_url,
		filename: filename,
	});
}
