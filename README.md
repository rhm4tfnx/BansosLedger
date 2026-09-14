# BansosLedger

BansosLedger adalah sistem pelaporan dan transparansi penyaluran bantuan sosial
berbasis blockchain dan smart contract yang dikembangkan untuk mendukung
pencatatan transaksi yang transparan, dapat ditelusuri, dan memiliki integritas data.

Project ini dikembangkan sebagai bagian dari penelitian:

**"Rancang Bangun Sistem Pelaporan dan Transparansi Dana Bantuan Sosial
Berbasis Blockchain dan Smart Contract untuk Mencegah Penyelewengan Dana."**

---

## Tujuan

BansosLedger dikembangkan untuk menyediakan sistem pelaporan bantuan sosial
yang mengintegrasikan aplikasi web, penyimpanan data off-chain, smart contract,
dan private blockchain.

Sistem dirancang untuk mendukung:

- Pengelolaan data penerima bantuan sosial
- Pengelolaan program dan periode bantuan
- Pencatatan proses penyaluran bantuan
- Transparansi riwayat transaksi
- Verifikasi transaksi melalui blockchain
- Pencegahan duplikasi pencatatan penyaluran
- Validasi transaksi melalui smart contract
- Pembatasan transaksi berdasarkan wallet yang berwenang
- Penyimpanan bukti penyaluran secara terdistribusi
- Audit trail transaksi yang dapat ditelusuri

---

## Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- Next.js Route Handlers
- REST API

### Database

- MongoDB
- MongoDB Atlas

MongoDB digunakan untuk menyimpan data operasional atau **off-chain**, seperti:

- Data penerima
- Data program bantuan
- Data periode
- Status penyaluran
- Data pengguna
- Transaction ID
- Log aktivitas

### Blockchain

#### Development

- Hardhat
- Hardhat Local Network

Hardhat digunakan selama proses pengembangan dan pengujian smart contract
secara lokal.

#### Final Research Network

- Hyperledger Besu
- QBFT Consensus
- Proof of Authority (PoA)
- 4 Validator Nodes
- Docker / Docker Compose
- VPS

Jaringan Besu QBFT digunakan sebagai private blockchain pada tahap implementasi
dan pengujian akhir penelitian.

### Smart Contract

- Solidity
- Hardhat
- ethers.js

Smart contract digunakan untuk menerapkan aturan transaksi penting pada proses
penyaluran bantuan sosial.

### Web3

- ethers.js
- MetaMask
- JSON-RPC

### Distributed File Storage

- IPFS
- Pinata

IPFS digunakan untuk menyimpan dokumen atau bukti penyaluran, sedangkan
referensi Content Identifier (CID) dapat digunakan untuk menjaga keterlacakan
dokumen.

---

## System Architecture

```text
                    BansosLedger
                         │
            ┌────────────┴────────────┐
            │                         │
        Next.js                    MetaMask
    Frontend + Backend                 │
            │                         │
      ┌─────┴─────┐                   │
      │           │                   │
  MongoDB       IPFS               ethers.js
 Off-chain     Pinata                  │
                                      │
                                  JSON-RPC
                                      │
                                      ▼
                             Besu QBFT Network
                                      │
                  ┌───────────┬───────┼───────────┐
                  │           │       │           │
             Validator 1 Validator 2 Validator 3 Validator 4
