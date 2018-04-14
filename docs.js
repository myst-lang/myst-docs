const $ = document.querySelector.bind(document);

this.tmpl = function tmpl(element) {
  return new Function("obj",
    "var p=[],print=function(){p.push.apply(p,arguments);};" +
    "with(obj){p.push('" +
    element.innerHTML
      .replace(/[\r\t\n]/g, " ")
      .split("<%").join("\t")
      .replace(/((^|%>)[^\t]*)'/g, "$1\r")
      .replace(/\t=(.*?)%>/g, "',$1,'")
      .split("\t").join("');")
      .split("%>").join("p.push('")
      .split("\r").join("\\'")
  + "');}return p.join('');");
};

class MarkdownRenderer {
  static render(content) {
    if(content == null) return "";
    return content
        // Convert newlines to distinct paragraphs.
        .split('\n').map(function(paragraph) {
          return "<p>" + paragraph + "</p>";
        }).join('')
        // Convert backtick spans to code fragments.
        .replace(/\`([^\`]*)\`/g, "<code>$1</code>");
  }
}

class MystDoc {
  constructor(sidebar_container, display_container) {
    this.sidebar_container = sidebar_container;
    this.display_container = display_container;
    this.sidebar_generator = tmpl($('#sidebar_template'));
    this.display_generator = tmpl($('#docs_template'));
    this.content = {};
    this.previous_content = null;
  }

  load(content) {
    this.previous_content = this.content;
    this.content = content;
  }

  // Lookup the given path in the doc structure
  navigate_to(path) {
    let content = this.content_for_path(path);
    let page_has_changed = content != this.previous_content;

    if(page_has_changed) {
      this.sidebar_container.innerHTML = this.sidebar_generator({
        root: this.content,
        content: content,
        misc: {
          parent: this.parent_of_path(content.full_name),
          page_has_changed: page_has_changed
        },
      });
    }

    this.display_container.innerHTML = this.display_generator({
      root: this.content,
      content: content,
      misc: {
        parent: this.parent_of_path(content.full_name),
        page_has_changed: page_has_changed
      },
    });

    this.previous_content = content;
  }


  content_for_path(path) {
    // If the path is empty, just use the root.
    if(path == "") {
      return this.content;
    }

    let content = this.content;

    const path_components = this.path_components_for(path);
    for(var i = 0; i < path_components.length; i++) {
      let path_component = path_components[i];

      // Only modules and types have their own page. Constants, methods, etc.
      // use their containing type/module as the content, then skip directly to
      // that entry on the page.
      let container = content.submodules  && content.submodules[path_component] ||
                      content.subtypes    && content.subtypes[path_component];

      if(container) {
        content = container;
      }
    }

    return content;
  }

  path_components_for(path) {
    return path.split(/\.|\#/);
  }

  parent_of_path(path) {
    if(!path || path.length == 0) {
      return null;
    } else {
      return path.split(/(?=\.|\#)/g).slice(0, -1).join('');
    }
  }
};



const $docs = new MystDoc($('#sidebar'), $('#display'));

$render = {
  constant: tmpl($('#constant_template')),
  method: tmpl($('#method_template')),
  sidebar_section: tmpl($('#sidebar_section_template')),
  sidebar: tmpl($('#sidebar_template')),
  sorted_list: tmpl($('#sorted_list_template'))
}


function navigate_from_href() {
  let full_name = decodeURIComponent(window.location.hash.replace(/^\#/, ''));
  $docs.navigate_to(full_name);
  let active_element = $(`[id="${full_name}"]`);
  if(active_element) {
    active_element.scrollIntoView();
    $('.display-wrapper').scrollTop -= 60;
  }
};


fetch('myst.json')
  .then(function(response) { return response.json(); })
  .then(function(data) {
    $docs.load(data);
    navigate_from_href();
  });


window.addEventListener("hashchange", navigate_from_href, true);
window.addEventListener("popstate", navigate_from_href, true);
