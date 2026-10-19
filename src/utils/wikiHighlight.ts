import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import powershell from 'highlight.js/lib/languages/powershell'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const languages = {
  bash, c, cpp, csharp, css, diff, dockerfile, go, ini, java,
  javascript, json, markdown, php, powershell, python, ruby, rust,
  sql, typescript, xml, yaml,
}

for (const [name, definition] of Object.entries(languages)) {
  hljs.registerLanguage(name, definition)
}

hljs.registerAliases(['js', 'jsx', 'mjs', 'cjs'], { languageName: 'javascript' })
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' })
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' })
hljs.registerAliases(['html', 'htm', 'svg', 'xhtml'], { languageName: 'xml' })
hljs.registerAliases(['h'], { languageName: 'c' })
hljs.registerAliases(['c++', 'cc', 'cxx', 'hpp', 'hxx'], { languageName: 'cpp' })
hljs.registerAliases(['cs', 'c#'], { languageName: 'csharp' })
hljs.registerAliases(['yml'], { languageName: 'yaml' })
hljs.registerAliases(['ps1', 'pwsh'], { languageName: 'powershell' })
hljs.registerAliases(['postgres', 'postgresql', 'mysql', 'sqlite'], { languageName: 'sql' })

export interface HighlightToken {
  text: string
  className?: string
}

function plainLines(source: string): HighlightToken[][] {
  return source.split('\n').map((text) => [{ text }])
}

export function highlightCodeLines(source: string, language: string) {
  const requested = language.trim().toLowerCase()
  const definition = requested && hljs.getLanguage(requested)
  if (!definition) return { language: '', lines: plainLines(source) }

  const result = hljs.highlight(source, { language: requested, ignoreIllegals: true })
  const parsed = new DOMParser().parseFromString(result.value, 'text/html')
  const lines: HighlightToken[][] = [[]]

  const append = (text: string, className?: string) => {
    const parts = text.split('\n')
    parts.forEach((part, index) => {
      if (part) lines[lines.length - 1].push({ text: part, className })
      if (index < parts.length - 1) lines.push([])
    })
  }

  const visit = (node: Node, inheritedClass?: string) => {
    if (node.nodeType === Node.TEXT_NODE) {
      append(node.textContent ?? '', inheritedClass)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as HTMLElement
    const ownClass = element.getAttribute('class')
    const className = [inheritedClass, ownClass].filter(Boolean).join(' ')
    for (const child of Array.from(element.childNodes)) visit(child, className || undefined)
  }

  for (const child of Array.from(parsed.body.childNodes)) visit(child)
  return { language: result.language ?? requested, lines }
}
