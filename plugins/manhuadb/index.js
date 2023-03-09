var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

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
	var script = mango.css(html, 'script')[7];
	script = script.substring(16 + 8, script.length - 2 - 9);
	var img_urls = JSON.parse(Base64.decode(script));
	var img_url_front = mango.attribute(mango.css(html, '.show-pic')[0], 'src');
	img_url_front = img_url_front.substring(0, img_url_front.search(img_urls[0]['img']));
	var image_urls = [];
	for(i = 0; i < img_urls.length; i++) {
		image_urls.push(img_url_front + img_urls[i]['img'])
	}
	var info = mango.css(html, '.breadcrumb-item');
	var title = mango.text(mango.css(info[info.length - 1], 'a')[0]);
	var page_num = img_urls.length;
	var manga_title = mango.text(mango.css(info[info.length - 2], 'a')[0]);
	mango.storage('images', image_urls.toString());
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
	const urls = mango.storage('images').split(',');
	const filename = page + '.jpg';
	if (page >= urls.length) return JSON.stringify({});
	var img_url = urls[page];
	mango.storage('page', (page + 1).toString());
	return JSON.stringify({
		url: img_url,
		filename: filename,
	});
}
