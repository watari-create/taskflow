# TaskFlow — 業務進捗タスク管理システム

Next.js 14 + Firebase Firestore + Vercel で構築した業務進捗管理アプリです。

## 機能

- **プロジェクト管理** — カラー付きプロジェクトの作成・編集・削除
- **タスク管理** — ステータス・優先度・期限・担当者・進捗%
- **メンバー管理** — ロール（オーナー/メンバー/閲覧者）付きメンバー管理
- **ダッシュボード** — 全プロジェクトの進捗サマリー
- **リアルタイム同期** — Firestore リアルタイムリスナーで即時反映

---

## セットアップ

### 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」
3. **Firestore Database** を作成（本番モードまたはテストモード）
4. **プロジェクト設定 > ウェブアプリを追加** して設定値をコピー

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して Firebase 設定値を入力：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Firestore インデックスの作成

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:indexes
```

または初回クエリ時にコンソールに表示されるリンクから手動作成。

### 4. ローカル起動

```bash
npm install
npm run dev
```

`http://localhost:3000` で確認。

---

## Vercel へのデプロイ（社内公開手順）

### ① GitHub にプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<your-org>/taskflow.git
git push -u origin main
```

### ② Vercel でインポート

1. [vercel.com/new](https://vercel.com/new) を開く
2. 上記リポジトリを選択して「Import」
3. Framework は **Next.js** が自動検出される

### ③ 環境変数を設定

Vercel の「Environment Variables」に以下を全て追加：

| Key | Value |
|-----|-------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebaseコンソールから取得 |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | 〃 |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | 〃 |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | 〃 |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | 〃 |
| NEXT_PUBLIC_FIREBASE_APP_ID | 〃 |

### ④ デプロイ → URL を社員に共有

デプロイ完了後、Vercel が発行した URL（例: `https://taskflow-xxx.vercel.app`）を
社員に Slack / メール等で共有するだけで利用開始できます。

> **注意**: URLを知っていれば誰でもアクセス・編集できます。
> 社外に漏れないよう URL の取り扱いにご注意ください。

### ⑤ Firestore セキュリティルールをデプロイ

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Firestore データ構造

```
/projects/{projectId}
  name: string
  description: string
  color: string
  memberIds: string[]
  createdAt: Timestamp
  updatedAt: Timestamp

/tasks/{taskId}
  projectId: string
  title: string
  description: string
  status: "todo" | "in_progress" | "review" | "done"
  priority: "low" | "medium" | "high" | "critical"
  progress: number (0-100)
  assigneeIds: string[]
  dueDate: string | null
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp

/members/{memberId}
  name: string
  email: string
  role: "owner" | "member" | "viewer"
  avatarColor: string
  createdAt: Timestamp
```

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| データベース | Firebase Firestore |
| ホスティング | Vercel |
| アイコン | Lucide React |
| フォント | DM Sans (Google Fonts) |
