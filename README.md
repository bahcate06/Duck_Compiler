<div align="center">

```
██████╗ ██╗   ██╗ ██████╗██╗  ██╗     ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗██╗     ███████╗██████╗
██╔══██╗██║   ██║██╔════╝██║ ██╔╝    ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║██║     ██╔════╝██╔══██╗
██║  ██║██║   ██║██║     █████╔╝     ██║     ██║   ██║██╔████╔██║██████╔╝██║██║     █████╗  ██████╔╝
██║  ██║██║   ██║██║     ██╔═██╗     ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║██║     ██╔══╝  ██╔══██╗
██████╔╝╚██████╔╝╚██████╗██║  ██╗    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ██║███████╗███████╗██║  ██║
╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
```

```
    __
  >(o )___
   ( ._> /
    `---'   ~ compile code, the duck way ~
```

</div>

## About

A web-based code compiler that fetches repositories from GitHub and runs code using the JDoodle API. Built with React, TypeScript, and Vite.

## Features

- Fetch and browse GitHub repositories
- Syntax highlighting with Prism
- Markdown rendering for README files
- Resizable panels
- Multiple language support (Python, Java, C, C++, JavaScript, Ruby, Go, Rust, PHP)
- Interactive input detection
- Gruvbox dark theme

## Tech Stack

- React 18 + TypeScript
- Vite
- Framer Motion
- react-resizable-panels
- prism-react-renderer
- react-markdown
- Vercel Serverless Functions

## Getting Started

```bash
# Clone
quacky clone bahcate06/Duck_Compiler

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your JDoodle credentials

# Run development server
npm run dev
```

## Environment Variables

```bash
JDOODLE_CLIENT_ID=your_client_id_here
JDOODLE_CLIENT_SECRET=your_client_secret_here
```

Get your API credentials at [jdoodle.com/compiler-api](https://www.jdoodle.com/compiler-api)

## Deploy to Vercel

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

## License

MIT

---

<div align="center">

Powered by [JDoodle API](https://www.jdoodle.com/compiler-api)

</div>
