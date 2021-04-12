var headers = {
	'Cookie': 'nw=1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:79.0) Gecko/20100101 Firefox/79.0'
};

var data = []
var pageCount = 0;

function listChapters(url) {
    
    var html = mango.get(url, headers).body
    
    var titleNode = mango.css(html, '.post-title')[0]
    
    var title = mango.text(titleNode).trim()
    
    var chaptersNode = mango.css(html, '.wp-manga-chapter')
    
    var chapters = []
    
    chaptersNode.forEach(function(element) {
        var chapterTitleNode = mango.css(element, '[href]')[0]
        var chapterTitle = mango.text(chapterTitleNode).trim().split(" ").slice(0, 2).join(" ") 
        var id = mango.attribute(chapterTitleNode, 'href')
        chapters.push({ id: toHex(id), title: chapterTitle })
    })

    return JSON.stringify({ chapters: chapters, title: title })
}

function selectChapter(id) {
    
    var link = fromHex(id)
    
    var html = mango.get(link, headers).body
    
    var titleNode = mango.css(html, '.main-col h1')[0]
    
    var title = mango.text(titleNode).trim()
    
    var readingContentNode = mango.css(html, '.reading-content .page-break img')
    
    readingContentNode.forEach(function (element) {
        var url = mango.attribute(element, 'data-src')
        var id = mango.attribute(element, 'id')
        data.push({ url: url, id: id })
    })

    return JSON.stringify({
        title: title,
        pages: data.length
    });
}

function nextPage() {
    
    if (pageCount == data.length) {
        return JSON.stringify({});
    }
	
    var url = data[pageCount].url
    
    var filename = data[pageCount].id
    
    pageCount += 1;
    
    return JSON.stringify({
        url: url,
        filename: filename + '.jpg',
        headers: headers
      });
}

// convert url to hex string 
function toHex(s) {
    // utf8 to latin1
    var s = unescape(encodeURIComponent(s))
    var h = ''
    for (var i = 0; i < s.length; i++) {
        h += s.charCodeAt(i).toString(16)
    }
    return h
}

// convert hex string to url
function fromHex(h) {
    var s = ''
    for (var i = 0; i < h.length; i+=2) {
        s += String.fromCharCode(parseInt(h.substr(i, 2), 16))
    }
    return decodeURIComponent(escape(s))
}