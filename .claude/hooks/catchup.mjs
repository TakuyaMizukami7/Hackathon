#!/usr/bin/env node
/**
 * SessionStart フック — 新しいチャットが始まった瞬間に「現状」を集めてコンテキストに流し込む。
 *
 * CLAUDE.md の「作業を始める前に必ずやること」を AI が手動で実行する代わりに、
 * ここで先回りして集める。/catchup を打ち忘れても現状把握が抜けなくなる。
 *
 * 出力は Claude Code の hook JSON。additionalContext がそのままモデルの文脈に入る。
 * 失敗しても握りつぶす（セッション開始をブロックしない）。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

/** git を叩く。失敗したら null（リポジトリでない場合など） */
function git(...args) {
  try {
    // stderr は捨てる。上流ブランチが無いときの警告でセッション開始を汚さないため
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

/** ファイルを読む。無ければ null。長すぎるときは頭を maxLines 行だけ */
function read(path, maxLines = Infinity) {
  try {
    const lines = readFileSync(join(root, path), 'utf8').split('\n')
    return lines.length > maxLines
      ? `${lines.slice(0, maxLines).join('\n')}\n…(以下省略)`
      : lines.join('\n')
  } catch {
    return null
  }
}

const sections = []
const add = (title, body) => {
  if (body) sections.push(`### ${title}\n\n${body}`)
}

// 1. 今どこにいるか
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch) {
  const dirty = git('status', '--short')
  // 上流がまだ無いブランチ（push 前）は origin/main と比べる
  const base = git('rev-parse', '--verify', `origin/${branch}`) ? `origin/${branch}` : 'origin/main'
  const ahead = git('log', '--oneline', `${base}..HEAD`)
  const behind = git('log', '--oneline', `HEAD..${base}`)
  add(
    '現在地',
    [
      `ブランチ: ${branch}`,
      `未コミットの変更: ${dirty ? `あり\n${dirty}` : 'なし'}`,
      `${base} より進んでいるコミット: ${ahead ? `あり\n${ahead}` : 'なし'}`,
      `${base} から取り込んでいないコミット: ${behind ? `あり\n${behind}` : 'なし'}`,
    ].join('\n'),
  )
}

// 2. これまでの開発の流れ
add('直近のコミット (git log --oneline -20)', git('log', '--oneline', '-20'))

// 3. フロントとサーバーの契約
add('src/shared/types.ts（フロントとサーバーの契約）', read('src/shared/types.ts'))

// 4. 2人それぞれの作業ログ（最新エントリだけ拾えれば十分なので頭 60 行）
try {
  const logs = readdirSync(join(root, 'docs/devlog'))
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => `--- docs/devlog/${f} ---\n${read(`docs/devlog/${f}`, 60)}`)
    .join('\n\n')
  add('作業ログ（devlog）', logs)
} catch {
  // devlog が無いだけ。何もしない
}

// 5. 今ある機能と担当の分かれ方
try {
  const features = readdirSync(join(root, 'src/features'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
  add('src/features/ の機能ディレクトリ', features.length ? features.join('\n') : '(まだ無し)')
} catch {
  // features が無いだけ
}

const context = `<project-catchup>
以下はセッション開始時に自動収集したこのプロジェクトの現状（CLAUDE.md の「作業を始める前に必ずやること」に相当）。
ユーザーの依頼に取りかかる前に、この内容を次の形式で簡潔に報告すること。長い要約は要らない。

【現在地】ブランチ / 未コミットの変更の有無 / main との差
【直近の開発】直近数コミットで何が出来たか（3行以内）
【設計の要点】types.ts の契約で今決まっていること
【申し送り】devlog の「次やること」「相方への申し送り」
【気になる点】未検証・未着手で、着手前に確認した方がよいこと（あれば）

ユーザーが最初から具体的な作業を依頼している場合は、報告を 3〜5 行に圧縮してから着手してよい。
情報が足りなければ普通にファイルを読んで補うこと。

${sections.join('\n\n')}
</project-catchup>`

process.stdout.write(
  JSON.stringify({
    systemMessage: `プロジェクトの現状を自動読み込みしました（ブランチ: ${branch ?? '不明'}）`,
    suppressOutput: true,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }),
)
