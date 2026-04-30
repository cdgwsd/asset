export function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readJsonFile<T>(file: File): Promise<T> {
  const text = await file.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('文件内容异常或已损坏')
  }
}
