# Doc Chat

Amazon Bedrock document question-and-answer application, built with React, Node.js, MySQL, Amazon S3, and Amazon Bedrock.

Repository: `Amazon-Bedrock-Project-document-chat-app`

Users register or sign in, upload a PDF or Word (`.docx`) file, and ask questions about that file. The backend stores the original document in S3, builds a retrieval-augmented generation (RAG) index in MySQL, and answers through Amazon Bedrock.

---

## Features

- Email and password authentication (JWT)
- Change password from the signed-in workspace
- Upload PDF or DOCX files (maximum 10 MB)
- Persistent document list and previous chat history
- RAG pipeline: text extraction, chunking, Titan embeddings, cosine retrieval
- Answers generated on Amazon Bedrock with **Amazon Nova Lite** (default) or **Claude 3 Haiku**
- Original files stored in a private Amazon S3 bucket

---

## Architecture

```
Browser (React + Vite)     http://localhost:5173
        |
        |  /api  (Vite proxy)
        v
Express API                http://localhost:5000
        |
        +-- MySQL          users, documents, chunks, messages
        +-- Amazon S3      original PDF / DOCX objects
        +-- Amazon Bedrock Titan Text Embeddings V2
        +-- Amazon Bedrock Amazon Nova Lite (default chat model)
        +-- Amazon Bedrock Claude 3 Haiku (optional chat model)
```

The browser never receives AWS credentials. Only the Node.js server calls S3 and Bedrock.

---

## Tech stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19, Vite 8                                |
| Backend    | Node.js, Express 5                              |
| Database   | MySQL 8                                         |
| Storage    | Amazon S3                                       |
| AI         | Amazon Bedrock (Titan Embeddings V2, Nova Lite, Claude 3 Haiku) |
| Auth       | bcrypt, JSON Web Tokens                         |

Default region: `ap-south-1` (Mumbai).

---

## Prerequisites

- Node.js 20 or later
- npm
- MySQL 8, with a database named `amazonbedrock` (existing local database name)
- An AWS account with:
  - An S3 bucket. The bucket created for this project is named `amazon-beadrock` (AWS does not allow renaming a bucket)
  - IAM access keys with permission to write to that bucket and to invoke Amazon Bedrock
  - IAM access keys with permission to write to that bucket and to invoke Bedrock
  - Model access in Amazon Bedrock for:
    - Amazon Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`)
    - Amazon Nova Lite (`apac.amazon.nova-lite-v1:0`) — default chat model
    - Anthropic Claude 3 Haiku — optional chat model (see [Bedrock models](#bedrock-models))

---

## AWS configuration

1. Create or select an S3 bucket in `ap-south-1`. Keep **Block public access** enabled.
2. Create an IAM user for the application (programmatic access only).
3. Attach a least-privilege policy that allows:
   - `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` on that bucket
   - `bedrock:InvokeModel`
4. Create an access key for that user. Store it only in `server/.env`.
5. In Amazon Bedrock → Model access (same region), enable:
   - Amazon Titan Text Embeddings V2
   - Amazon Nova Lite
   - Anthropic Claude 3 Haiku (optional; requires a valid payment method / AWS Marketplace agreement)

---

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/<your-github-username>/Amazon-Bedrock-Project-document-chat-app.git
cd Amazon-Bedrock-Project-document-chat-app
```

### 2. Create the MySQL database

```sql
CREATE DATABASE IF NOT EXISTS amazonbedrock;
```

The API creates tables automatically on first start (`users`, `documents`, `document_chunks`, `messages`).

### 3. Configure environment variables

```bash
copy server\.env.example server\.env
```

On macOS or Linux:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set:

| Variable                   | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `JWT_SECRET`               | Long random string used to sign login tokens     |
| `AWS_REGION`               | AWS region (default `ap-south-1`)                |
| `AWS_ACCESS_KEY_ID`        | IAM access key ID                                |
| `AWS_SECRET_ACCESS_KEY`    | IAM secret access key                            |
| `S3_BUCKET_NAME`           | Existing bucket name (`amazon-beadrock`)         |
| `BEDROCK_MODEL_ID`         | Chat model: Nova Lite (default) or Claude 3 Haiku |
| `BEDROCK_EMBED_MODEL_ID`   | Embedding model ID                               |
| `MYSQL_HOST`               | MySQL host (`localhost` for local development)   |
| `MYSQL_USER`               | MySQL user                                       |
| `MYSQL_PASSWORD`           | MySQL password                                   |
| `MYSQL_DATABASE`           | Existing database name (`amazonbedrock`)        |


---

## Bedrock models

Embeddings always use Titan. Chat answers can use either Nova Lite or Claude 3 Haiku. The backend already supports both request formats; you only change `BEDROCK_MODEL_ID` in `server/.env`.

| Role       | Model                         | Environment value                                      | Notes |
| ---------- | ----------------------------- | ------------------------------------------------------ | ----- |
| Embeddings | Amazon Titan Text Embeddings V2 | `amazon.titan-embed-text-v2:0`                       | Required for RAG |
| Chat (default) | Amazon Nova Lite          | `apac.amazon.nova-lite-v1:0`                           | Works in `ap-south-1` without Anthropic Marketplace |
| Chat (optional) | Anthropic Claude 3 Haiku | `anthropic.claude-3-haiku-20240307-v1:0`             | Enable in Model access; needs a valid AWS payment instrument |
| Chat (optional, APAC profile) | Claude 3 Haiku | `apac.anthropic.claude-3-haiku-20240307-v1:0`     | Use this ID if on-demand Haiku is rejected in Mumbai |

To switch the chat model to Claude 3 Haiku:

1. Open Amazon Bedrock → **Model access** in `ap-south-1`.
2. Enable **Claude 3 Haiku** and wait until access is granted.
3. Confirm the AWS account has a valid payment method (Claude is billed through AWS Marketplace).
4. Set in `server/.env`:

```env
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

If Bedrock returns a validation error about on-demand throughput, use:

```env
BEDROCK_MODEL_ID=apac.anthropic.claude-3-haiku-20240307-v1:0
```

5. Restart the API (`npm run dev` in `server`).

To return to the default:

```env
BEDROCK_MODEL_ID=apac.amazon.nova-lite-v1:0
```

If Claude fails with `INVALID_PAYMENT_INSTRUMENT`, keep Nova Lite until billing is fixed. Titan embeddings are independent of Claude.

### 4. Install dependencies

Backend:

```bash
cd server
npm install
```

Frontend:

```bash
cd chatApp
npm install
```

---

## Run the application

Use two terminals.

**Terminal 1 — API**

```bash
cd server
npm run dev
```

The API listens on [http://localhost:5000](http://localhost:5000).  
Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

**Terminal 2 — frontend**

```bash
cd chatApp
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Vite proxies `/api` to `http://localhost:5000`.

### Typical first use

1. Register with an email and password (minimum 6 characters).
2. Upload a PDF or `.docx` file.
3. Ask a question about the document.
4. Re-open previous chats from the left sidebar.
5. Change the account password from **Change password** in the header.

---