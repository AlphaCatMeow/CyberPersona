# Setup and Run

## Clone

```bash
git clone https://github.com/harrylarryxyz/CyberPersona.git
cd CyberPersona
```

## Create config

```bash
cp .env.cyber-gf.example .env.cyber-gf
```

Fill in your actual values before running flows.

## Basic commands

```bash
node cyber-gf-controller.js 开始赛博女友
node cyber-gf-controller.js status
node cyber-gf-controller.js 退出赛博女友
node cyber-gf-controller.js 我们分手吧
```

## Start flow example

```bash
node cyber-gf-controller.js run-start-flow ./initial-payload.json
```

## Turn flow example

```bash
node cyber-gf-controller.js run-turn-flow ./turn-payload.json
```

## Debug

```bash
node cyber-gf-controller.js debug-on
node cyber-gf-controller.js debug-last
node cyber-gf-controller.js debug-off
```

## Voice helpers

```bash
node cyber-gf-controller.js last-audio
node cyber-gf-controller.js voice-send-payload
```
