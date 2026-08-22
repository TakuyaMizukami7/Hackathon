import { BiasFilter } from './features/bias-filter/BiasFilter'

/**
 * 画面に機能を並べるだけの場所。
 *
 * ★ App.tsx は 2 人が同時に触る唯一の画面ファイル。
 *   ロジックを書かず、<FeatureA /> <FeatureB /> を並べるだけに保つこと。
 *   そうすれば差分が 1 行ずつになり、コンフリクトしてもすぐ直せる。
 *
 * 配線確認用のサンプル（/api/health と /api/chat のパネル）は FE-4 で撤去した。
 * サーバーの疎通を見たいときは本番URLに直接 /api/health を叩く（docs/DEPLOY.md）。
 */
export default function App() {
  return (
    <main>
      <BiasFilter />
    </main>
  )
}
