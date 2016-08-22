module.exports = function h (tag, attr, children) {
  if (Array.isArray(attr)) {
    children = attr
    attr = {}
  }
  if (!children) children = []
  if (!Array.isArray(children)) children = [children]
  if (!attr) attr = {}

  var open = '<' + tag.replace(/[\/!]$/, '')
  var kattr = Object.keys(attr)
  if (kattr.length) {
    open += ' ' + kattr.map(function (k) {
      return enc(k) + '="' + enc(attr[k]) + '"'
    }).join(' ')
  }
  if (/^\?/.test(tag)) {
    return open + '?>' + children.join('')
  } else if (/!$/.test(tag)) {
    return open + '>' + children.join('')
  } else if (!children.length) { // self-closing
    return open + '/>'
  } else {
    return open + '>' + children.join('') + '</' + tag + '>'
  }
}

function enc (str) {
  if (typeof str !== 'string') str = String(str)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
}
