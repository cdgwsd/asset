const svgModules = import.meta.glob<{ default: string }>('../assets/account-icons/*.svg', {
  eager: true,
  query: '?url'
})

export interface SvgIconOption {
  fileName: string
  label: string
  url: string
}

export function getSvgIconOptions(): SvgIconOption[] {
  const options: SvgIconOption[] = []

  for (const [path, module] of Object.entries(svgModules)) {
    const fileName = path.split('/').pop() ?? ''
    const label = fileName.replace(/\.svg$/i, '').replace(/[-_]/g, ' ')
    options.push({
      fileName,
      label,
      url: module.default
    })
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

export function getSvgIconUrl(fileName: string): string | undefined {
  const path = `../assets/account-icons/${fileName}`

  for (const [key, module] of Object.entries(svgModules)) {
    if (key.endsWith(`/${fileName}`)) {
      return module.default
    }
  }

  return undefined
}
