# Quick Start Guide: Prompt – Multi-Tenant AI-Powered RAG-Based Document Intelligence Platform

## Prerequisites

- **Python 3.11+** (backend)
- **Node.js 18+** (frontend and mobile)
- **Java 11+** (for Android builds if developing mobile app)
- **Git**
- **Access to Supabase account** (free tier)
- **Access to Google Cloud Console** (for Gemini API keys)
- **Twilio account** (for SMS OTP in Pakistan)

## Tesseract OCR Setup (Required for Urdu/Sindhi Knowledge Base Upload)

### Ubuntu / Debian (recommended)

```bash
# Install Tesseract 4.x with LSTM engine
sudo apt-get update
sudo apt-get install -y tesseract-ocr

# Install Urdu language pack
sudo apt-get install -y tesseract-ocr-urd

# Install Sindhi language pack (if available in your repo)
sudo apt-get install -y tesseract-ocr-snd

# Verify installation
tesseract --version
tesseract --list-langs   # Should include: eng, urd (snd if installed)

# If tesseract-ocr-snd is not available in your package repo:
# Download from https://github.com/tesseract-ocr/tessdata
# and copy to /usr/share/tesseract-ocr/4.00/tessdata/snd.traineddata
sudo wget -P /usr/share/tesseract-ocr/4.00/tessdata/ \
  https://github.com/tesseract-ocr/tessdata/raw/main/snd.traineddata
```

### macOS

```bash
brew install tesseract
brew install tesseract-lang   # includes all language packs
```

### Windows

1. Download installer from https://github.com/UB-Mannheim/tesseract/wiki
2. Install with "Additional language data (download)" → select Urdu + Sindhi
3. Add Tesseract to PATH
4. Set `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe` in `backend/.env`

### Verify OCR for Urdu/Sindhi

```bash
# Test Urdu OCR with a sample image
echo "اردو ٹیسٹ" | tesseract stdin stdout -l urd
```

### EasyOCR (Automatic fallback)

EasyOCR is installed as a Python dependency and runs automatically as a fallback
when Tesseract confidence is below 70%. It uses HuggingFace models stored at:

```
/media/riaz/New Volume/zero-cost setup/hf_cache
```

To pre-download EasyOCR Arabic-script models:

```bash
cd backend
python -c "import easyocr; easyocr.Reader(['ar', 'en'])"  # Downloads ~500MB once
```

## Environment Setup

### 1. Clone and Initialize

```bash
git clone <repository-url>
cd prompt-platform
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Configure environment variables
nano .env
```

Required environment variables:
```env
# Database
SUPABASE_URL=<your_supabase_project_url>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
DATABASE_URL=<your_postgresql_connection_string>

# AI / LLM
GEMINI_API_KEYS=<comma_separated_gemini_keys_for_rotation>

# Auth
JWT_SECRET=<your_jwt_secret>
TWILIO_ACCOUNT_SID=<your_twilio_account_sid>
TWILIO_AUTH_TOKEN=<your_twilio_auth_token>
TWILIO_PHONE_NUMBER=<your_twilio_phone_number>

# Vector Store
CHROMADB_PATH=./data/chromadb

# OCR (MVP)
TESSERACT_CMD=/usr/bin/tesseract       # path to tesseract binary
TESSERACT_LANG_PATH=/usr/share/tesseract-ocr/4.00/tessdata  # language pack path
OCR_CONFIDENCE_THRESHOLD=0.70          # pages below this are flagged for review

# Voice / Speech (Phase 2 – Pilot, leave blank for MVP)
OPENAI_API_KEY=<your_openai_api_key>   # used for Whisper speech-to-text
VOICE_AUDIO_TEMP_DIR=./data/voice_temp # temporary audio storage (auto-deleted)
VOICE_AUDIO_MAX_SIZE_MB=25             # max audio upload size

# Text-to-Speech (Phase 3 – Full Scale, leave blank for MVP and Pilot)
GOOGLE_CLOUD_TTS_KEY=<your_gcp_service_account_json_path>
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy environment template
cp .env.local.example .env.local

# Configure environment variables
nano .env.local
```

Required environment variables:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

### 4. Mobile Setup

```bash
cd mobile
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
nano .env
```

Required environment variables:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=<your_supabase_project_url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

## Database Setup

### 1. Supabase Configuration

1. Create a new Supabase project using the free tier
2. Enable Row Level Security (RLS) for all tables
3. Create the following tables and RLS policies:

```sql
-- Users table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  verification_code TEXT,
  verification_expires TIMESTAMPTZ,
  domain_id UUID REFERENCES domains(id),
  subscription_tier TEXT DEFAULT 'basic',
  role TEXT DEFAULT 'user',
  document_generation_count INTEGER DEFAULT 0,
  upload_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Domains table
CREATE TABLE domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  status TEXT DEFAULT 'active',
  configuration JSONB,
  knowledge_base_namespace TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view active domains" ON domains FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage domains" ON domains FOR ALL TO authenticated USING (role = 'root_admin');

-- Add other tables similarly with RLS policies...
```

### 2. Local Vector Database (ChromaDB)

The application uses ChromaDB for vector storage. The backend will automatically create the database directory:

```bash
mkdir -p ./backend/data/chromadb
```

## Running the Applications

### Backend (FastAPI)

```bash
cd backend
uvicorn src.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend (Next.js)

```bash
cd frontend
npm run dev
```

The web app will be available at `http://localhost:3000`

### Mobile (React Native)

```bash
cd mobile
npx expo start
```

Use the Expo Go app to run on device, or use simulators for development.

## Key Configuration Points

### 1. Multilingual Support (Urdu/Sindhi)

The system is configured to support Urdu and Sindhi languages:
- Embedding model: `multilingual-e5-base` (for better multilingual retrieval)
- PDF generation: Supports Jameel Noori Nastaleeq font for Urdu
- Text processing: Handles RTL languages and mixed-script documents

### 2. OCR for Image-Based PDFs

To enable OCR for image-based PDFs:
1. Install Tesseract: `sudo apt-get install tesseract-ocr` (Ubuntu) or equivalent for your OS
2. Install language packs: `sudo apt-get install tesseract-ocr-urd` for Urdu support
3. The system will automatically detect image-based PDFs and apply OCR during ingestion

### 3. API Key Rotation

Configure multiple Gemini API keys for rate limit management:
```env
GEMINI_API_KEYS=key1,key2,key3
```

The system will rotate keys automatically when encountering rate limits.

### 4. Subscription Tiers

For MVP, only the Basic tier is active. To simulate paid tiers in the UI:
- Set `SHOW_PAID_TIERS=true` in frontend environment
- Paid tier features will display "Coming Soon" messaging

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/verify` - Registration verification
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh

### Core Functionality
- `GET /domains` - List available domains
- `POST /documents/upload` - Upload knowledge base documents
- `GET /documents` - Get user's documents
- `POST /chat` - Generate documents using RAG
- `GET /templates` - Get available templates
- `POST /tokens/apply` - Apply promotional tokens

## Development Workflow

1. **Start backend**: `cd backend && uvicorn src.main:app --reload`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Start mobile**: `cd mobile && npx expo start`
4. **Run tests**: `cd backend && pytest` or `cd frontend && npm test`

## Troubleshooting

### Common Issues

1. **Supabase RLS blocking access**: Ensure JWT is properly validated in API endpoints
2. **Vector search returning no results**: Check that documents are properly embedded and indexed
3. **Multilingual support not working**: Verify embedding model is multilingual and fonts are properly installed
4. **OCR not processing images**: Check Tesseract installation and language packs

### Performance Optimization

- **Semantic caching**: Cache API responses with high similarity (>0.92) to reduce API calls
- **Embedding reuse**: Store and reuse embeddings for unchanged documents
- **Connection pooling**: Backend uses connection pooling for database queries