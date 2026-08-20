import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * 画面が真っ白になるのを防ぐための保険。
 * 審査中に render でエラーが出ても、真っ白ではなくエラー内容が出る。
 * （真っ白は「動きません」と同じ扱いになるので絶対に避ける）
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel error">
          <h2>エラーが発生しました</h2>
          <pre>{this.state.error.message}</pre>
          <button type="button" onClick={() => location.reload()}>
            リロード
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
