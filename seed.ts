import { getDb, createUser, findUserByEmail, createProject, moderateProject } from './db.ts';
import dotenv from 'dotenv';
dotenv.config();

export async function runSeed() {
  console.log('🌱 Starting database seed...');
  await getDb();

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@campuscraft.edu';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

  let admin = await findUserByEmail(adminEmail);
  if (!admin) {
    admin = await createUser(adminEmail, adminPassword, 'SUPER_ADMIN');
    console.log(`✅ Created admin user: ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
  }

  // 2. Sample Projects
  const sampleProjects = [
    {
      title: 'NeuralTrace: Real-Time Saccadic Eye Tracking for Concussion Screening',
      studentName: 'Elena Rostova & Liam Chen (Biomedical Eng)',
      description: 'A low-latency computer vision framework utilizing lightweight convolutional nets to detect micro-saccades and pupil dilation anomalies on commodity webcams for preliminary athletic triage.',
      githubUrl: 'https://github.com/tensorflow/models',
      liveUrl: 'https://tensorflow.org',
      tags: ['computer-vision', 'machine-learning', 'python', 'bioinformatics'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 14,
    },
    {
      title: 'KubePebble: Autonomous Scale-to-Zero Microcluster Orchestration',
      studentName: 'Marcus Vance (Computer Science)',
      description: 'A lightweight distributed scheduler engineered in Rust that dynamically throttles edge edge-nodes and spins down idle replicas in sub-50ms using eBPF packet sniffing.',
      githubUrl: 'https://github.com/rust-lang/rust',
      liveUrl: 'https://www.rust-lang.org',
      tags: ['rust', 'distributed-systems', 'kubernetes', 'cloud'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 12,
    },
    {
      title: 'EchoGraph: Interactive Visual Query Plan Profiler for Postgres',
      studentName: 'Aria Takahashi (Software Systems)',
      description: 'A WebGL-accelerated explain-analyzer that parses Postgres execution plans into topological node flows, isolating sequential scans, buffer spillages, and memory ceilings in complex joins.',
      githubUrl: 'https://github.com/postgres/postgres',
      liveUrl: 'https://www.postgresql.org',
      tags: ['typescript', 'react', 'databases', 'webgl'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 10,
    },
    {
      title: 'PulseGrid: Decentralized IoT Smart-Meter Mesh for Community Microgrids',
      studentName: 'Devon Patel & Sofia Al-Mansoor (Electrical & Computer Eng)',
      description: 'Hardware firmware and embedded C++ telemetry pipeline for balancing local photovoltaic distribution and automated peer-to-peer micro-billing over LoRaWAN radios.',
      githubUrl: 'https://github.com/espressif/esp-idf',
      liveUrl: 'https://www.espressif.com',
      tags: ['iot', 'embedded', 'clean-energy', 'cplusplus'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 9,
    },
    {
      title: 'AegisDNS: Zero-Knowledge Encrypted Resolver with Heuristic Threat Filtering',
      studentName: 'Kavita Rao (Cybersecurity & Networks)',
      description: 'A DNS-over-HTTPS recursive resolver written in Go with integrated bloom-filter lookups and synthetic reputation scoring against known zero-day C2 domains.',
      githubUrl: 'https://github.com/golang/go',
      liveUrl: 'https://go.dev',
      tags: ['cybersecurity', 'go', 'networking', 'privacy'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 7,
    },
    {
      title: 'SynapseCanvas: Collaborative Mind-Mapping with Operational Transformation',
      studentName: 'Leo Morales & Chloe Dupont (Interactive Media)',
      description: 'A real-time whiteboard canvas powered by CRDT algorithms, WebSockets, and canvas rendering, allowing 100+ concurrent student researchers to structure academic literature.',
      githubUrl: 'https://github.com/facebook/react',
      liveUrl: 'https://react.dev',
      tags: ['react', 'typescript', 'websockets', 'collaborative'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 6,
    },
    {
      title: 'GenScale: High-Throughput Sequence Alignment for Metagenomic Samples',
      studentName: 'Dr. Tariq Hassan Lab / Samira Khan',
      description: 'Optimized Smith-Waterman pairwise alignment leveraging AVX-512 vector extensions and memory-mapped k-mer indices to process oceanic microbiome sequencing FASTQ runs.',
      githubUrl: 'https://github.com/lh3/bwa',
      liveUrl: 'https://github.com',
      tags: ['bioinformatics', 'cplusplus', 'genomics', 'algorithms'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 4,
    },
    {
      title: 'VerbaVoice: On-Device Phoneme Reconstruction for Speech Impairments',
      studentName: 'Julian Bennett (Cognitive Science & CS)',
      description: 'A CoreML / WebAssembly on-device acoustic model transforming dysarthric speech patterns into natural, fluent synthesized audio in real time with zero cloud dependency.',
      githubUrl: 'https://github.com/apple/swift',
      liveUrl: 'https://www.apple.com',
      tags: ['machine-learning', 'audio', 'accessibility', 'python'],
      status: 'APPROVED' as const,
      createdAtOffsetDays: 3,
    },
    {
      title: 'QuantaSim: Interactive Qubit Gate Simulator with Quantum Phase Visualization',
      studentName: 'Zara O’Connor (Applied Physics & CS)',
      description: 'A browser-based quantum circuit builder that visualizes state vectors on 3D Bloch spheres and step-through quantum entanglement for introductory physics classes.',
      githubUrl: 'https://github.com/qiskit/qiskit',
      liveUrl: 'https://qiskit.org',
      tags: ['quantum', 'typescript', 'education', 'threejs'],
      status: 'PENDING' as const,
      createdAtOffsetDays: 1,
    },
    {
      title: 'CampusPantry: Predictive Redistribution Logistics for Student Food Pantries',
      studentName: 'Noah Washington (Operations Research)',
      description: 'A linear programming and demand-forecasting tool helping campus food hubs minimize perishable waste by scheduling autonomous volunteer distribution routes.',
      githubUrl: 'https://github.com/scipy/scipy',
      liveUrl: 'https://scipy.org',
      tags: ['python', 'data-science', 'social-impact'],
      status: 'PENDING' as const,
      createdAtOffsetDays: 0.5,
    },
    {
      title: 'HyperDraft: Automated LaTeX Drafting from Plain-Text Obsidian Notes',
      studentName: 'Mira Song (Human-Computer Interaction)',
      description: 'A Markdown compiler plugin that formats citations from Zotero, equations, and IEEE conference paper templates with instant live PDF previewing.',
      githubUrl: 'https://github.com/typst/typst',
      liveUrl: 'https://typst.app',
      tags: ['rust', 'productivity', 'latex', 'education'],
      status: 'PENDING' as const,
      createdAtOffsetDays: 0.2,
    },
    {
      title: 'QuickCrypto: Experimental Toy Blockchain with Zero-Fee PoS Consensus',
      studentName: 'Anonymous Submitter',
      description: 'A simple token minting test script without clear security guarantees or documentation.',
      githubUrl: 'https://github.com/bitcoin/bitcoin',
      liveUrl: 'https://bitcoin.org',
      tags: ['cryptocurrency', 'experimental'],
      status: 'REJECTED' as const,
      rejectionReason: 'Submission lacks academic project documentation, technical report, and clear learning objectives as outlined in showcase submission guidelines.',
      createdAtOffsetDays: 8,
    },
  ];

  for (const item of sampleProjects) {
    const { id } = await createProject({
      title: item.title,
      studentName: item.studentName,
      description: item.description,
      githubUrl: item.githubUrl,
      liveUrl: item.liveUrl,
      tags: item.tags,
      ip: '127.0.0.1',
    });

    if (item.status === 'APPROVED') {
      await moderateProject(id, admin.id, 'APPROVED', undefined, 'Initial seed approval');
    } else if (item.status === 'REJECTED') {
      await moderateProject(id, admin.id, 'REJECTED', item.rejectionReason, 'Initial seed rejection');
    }
  }

  console.log(`✅ Seeded ${sampleProjects.length} sample projects across APPROVED, PENDING, and REJECTED states.`);
  console.log('🎉 Seed complete!');
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed')) {
  runSeed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}
