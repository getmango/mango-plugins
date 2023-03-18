var downloadingChapter;

function searchManga(query) {
    return JSON.stringify([{
        id: query,
        title: query
    }]);
}

function _listChapters(mangaId, limit) {
    var imageList = [], tmpList;
    var page = 0, res;
    while (imageList.length < limit) {
        page++;
        res = mango.get('https://hentai-cosplays.com/search/keyword/' + encodeURIComponent(mangaId) + '/page/' + page);
        if (res.status_code !== 200)
            mango.raise('Failed to list Chapters. Status ' + res.status_code);
        tmpList = mango.css(res.body, '#image-list > li');
        if (tmpList.length == 0)
            break;
        imageList = imageList.concat(tmpList);
    }
    console.log('List chapters: ' + page + ' pages');
    return imageList.map(function (m) {
        const href = mango.attribute(mango.css(m, 'a')[0], 'href');
        const imgSrcSplited = mango.attribute(mango.css(m, 'img')[0], 'src').split('/');
        var dateStr = imgSrcSplited[4];
        dateStr = [dateStr.substring(0, 4), dateStr.substring(4, 6), dateStr.substring(6, 8)].join('-');
        return {
            id: href.substring(7, href.length - 1) + '@' + mangaId,
            token: imgSrcSplited.slice(4, 7).join('/'),
            title: mango.text(mango.css(m, 'p')[0]).trim(),
            manga_title: mangaId,
            published_at: Date.parse(dateStr),
            pages: 0,
        };
    });
}

function listChapters(mangaId) {
    const limit = parseInt(mango.settings('listChapterLimit') || '100');
    return JSON.stringify(_listChapters(mangaId, limit));
}

function selectChapter(id) {
    const splitID = id.split('@');
    const baseUrl = 'https://hentai-cosplays.com/image/' + splitID[0];
    const res = mango.get(baseUrl);
    if (res.status_code !== 200)
        mango.raise('Failed to select Chapter ' + id + 'Status ' + res.status_code);
    const lastPage = mango.css(res.body, '#paginator > span:last-child > a')[0];
    var lastPageRes = res;
    if (mango.attribute(lastPage, 'href').includes('/page/')) {
        lastPageRes = mango.get(baseUrl + '/page/' + mango.attribute(lastPage, 'href').split('/')[4]);
        if (lastPageRes.status_code !== 200)
            mango.raise('Failed to select Chapter ' + id + 'Status ' + lastPageRes.status_code);
    }
    const allImages = mango.css(lastPageRes.body, '.icon-overlay > a > img');
    const lastImageSrcSplited = mango.attribute(allImages[allImages.length - 1], 'src').split('/');
    const pages = parseInt(lastImageSrcSplited[lastImageSrcSplited.length - 1].split('.')[0]);
    downloadingChapter = {
        id: id,
        title: mango.text(mango.css(res.body, '#title')[0]),
        manga_title: splitID[1],
        pages: pages,
        domain: lastImageSrcSplited[2],
        token: lastImageSrcSplited.slice(4, 7).join('/'),
        digits: Math.floor(Math.log10(pages)) + 1,
        curPage: 1
    };
    return JSON.stringify(downloadingChapter);
}

function nextPage() {
    if (downloadingChapter.curPage > downloadingChapter.pages)
        return JSON.stringify({});
    const url = 'https://' + downloadingChapter.domain + '/upload/' + downloadingChapter.token + '/' + downloadingChapter.curPage + '.jpg';
    const filename = pad(downloadingChapter.curPage, downloadingChapter.digits) + '.jpg';
    downloadingChapter.curPage++;
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

function newChapters(mangaId, after) {
    var chapters = _listChapters(mangaId, 10).map(function (ch) {
        ch['tokenNumbers'] = ch.token.split('/').map(function (x) { return parseInt(x); });
        return ch;
    });
    chapters.sort(function (a, b) {
        return cmpToken(a.tokenNumbers, b.tokenNumbers);
    });
    var lastCheck = mango.storage('lastCheck') || '{}';
    lastCheck = JSON.parse(lastCheck);
    const afterDate = new Date(after);
    const afterDateStr = afterDate.getFullYear() + pad(afterDate.getMonth(), 2) + pad(afterDate.getDate(), 2);
    const afterTokenNum = lastCheck[mangaId] || [parseInt(afterDateStr), 0, 0];
    if (chapters.length > 0)
        lastCheck[mangaId] = chapters[0].tokenNumbers;
    else
        lastCheck[mangaId] = afterTokenNum;
    mango.storage('lastCheck', JSON.stringify(lastCheck));
    var index = 0;
    for (; index < chapters.length; ++index)
        if (cmpToken(chapters[index].tokenNumbers, afterTokenNum) >= 0)
            break;
    return JSON.stringify(chapters.slice(0, index));
}

function cmpToken(a, b) {
    if (a[0] == b[0] && a[1] == b[1])
        return b[2] - a[2];
    if (a[0] == b[0])
        return b[1] - a[1];
    return b[0] - a[0];
}