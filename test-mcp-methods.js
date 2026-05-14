#!/usr/bin/env node
/**
 * Comprehensive MCP CodeGraph Method Testing Script
 * Tests all 22 MCP methods with the actual MCP server
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const TIMEOUT = 30000; // 30 seconds per test
const TEST_PROJECT_DIR = process.cwd();

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

class MCPTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };
    this.serverProcess = null;
  }

  log(message, color = "reset") {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async startServer() {
    this.log("\n🚀 Starting MCP server...", "cyan");

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn("node", ["dist/index.js", TEST_PROJECT_DIR], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const timeout = setTimeout(() => {
        reject(new Error("Server startup timeout"));
      }, 20000);

      const startupMessages = ["MCP server running on stdio transport", "Server initialization complete"];

      function checkOutput(text) {
        return startupMessages.some((msg) => text.includes(msg));
      }

      this.serverProcess.stdout.on("data", (data) => {
        if (checkOutput(data.toString())) {
          clearTimeout(timeout);
          resolve();
        }
      });

      this.serverProcess.stderr.on("data", (data) => {
        if (checkOutput(data.toString())) {
          clearTimeout(timeout);
          resolve();
        }
      });

      this.serverProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async sendRawRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      };

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: ${method} took longer than ${TIMEOUT}ms`));
      }, TIMEOUT);

      let responseBuffer = "";

      const dataHandler = (data) => {
        responseBuffer += data.toString();
        try {
          const response = JSON.parse(responseBuffer);
          clearTimeout(timeout);
          this.serverProcess.stdout.removeListener("data", dataHandler);
          resolve(response);
        } catch (_e) {
          // Not complete JSON yet, wait for more data
        }
      };

      this.serverProcess.stdout.on("data", dataHandler);
      this.serverProcess.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  async sendRequest(method, args = {}) {
    return this.sendRawRequest("tools/call", {
      name: method,
      arguments: args,
    });
  }

  async performHandshake() {
    this.log("   Performing MCP initialization handshake...", "cyan");

    const initResponse = await this.sendRawRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "mcp-test-client",
        version: "1.0.0",
      },
    });

    if (initResponse.error) {
      throw new Error(`Initialize failed: ${initResponse.error.message}`);
    }

    this.log(`   ✅ Server initialized (protocol: ${initResponse.result?.protocolVersion || "unknown"})`, "green");

    const notification = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    };
    this.serverProcess.stdin.write(`${JSON.stringify(notification)}\n`);

    await new Promise((r) => setTimeout(r, 300));
  }

  unwrapMcpResult(response) {
    // MCP tools/call wraps result in content[0].text as JSON string
    const content = response.result?.content;
    if (Array.isArray(content) && content.length > 0 && content[0].type === "text") {
      try {
        const parsed = JSON.parse(content[0].text);
        // The server returns { success, data, meta } - we want the data
        return parsed.data !== undefined ? parsed.data : parsed;
      } catch {
        return content[0].text;
      }
    }
    return response.result;
  }

  async runTest(testName, method, args, validator) {
    this.results.total++;
    const startTime = Date.now();

    try {
      this.log(`\n📝 Testing: ${testName}`, "blue");
      this.log(`   Method: ${method}`, "reset");

      const response = await this.sendRequest(method, args);
      const duration = Date.now() - startTime;

      // Validate response
      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message || JSON.stringify(response.error)}`);
      }

      // Unwrap MCP result format
      const result = this.unwrapMcpResult(response);

      // Run custom validator if provided
      if (validator) {
        const validationResult = validator(result);
        if (!validationResult.valid) {
          throw new Error(`Validation failed: ${validationResult.error}`);
        }
      }

      this.results.passed++;
      this.results.tests.push({
        name: testName,
        method,
        status: "PASS",
        duration,
        response: result,
      });

      this.log(`   ✅ PASS (${duration}ms)`, "green");
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        method,
        status: "FAIL",
        duration,
        error: error.message,
      });

      this.log(`   ❌ FAIL (${duration}ms)`, "red");
      this.log(`   Error: ${error.message}`, "red");
      return null;
    }
  }

  async runAllTests() {
    this.log(`\n${"=".repeat(80)}`, "cyan");
    this.log("MCP CODEGRAPH COMPREHENSIVE METHOD TESTING", "cyan");
    this.log(`${"=".repeat(80)}\n`, "cyan");

    try {
      await this.startServer();
      this.log("✅ Server started successfully\n", "green");

      await this.performHandshake();
      this.log("✅ Handshake complete\n", "green");

      // ========== CORE OPERATIONS ==========
      this.log(`\n${"─".repeat(80)}`, "yellow");
      this.log("CORE OPERATIONS", "yellow");
      this.log("─".repeat(80), "yellow");

      await this.runTest("get_version - Get server version info", "get_version", {}, (result) => ({
        valid: result && result.server && typeof result.server.version === "string",
        error: "Version info not found",
      }));

      await this.runTest("get_graph_health - Check database health", "get_graph_health", {}, (result) => ({
        valid: result && typeof result.healthy !== "undefined" && result.totals,
        error: "Health info not found",
      }));

      await this.runTest(
        "index - Index the current directory",
        "index",
        { directory: TEST_PROJECT_DIR, incremental: true },
        (result) => ({
          valid: result && (result.message || result.result !== undefined),
          error: "Indexing failed",
        }),
      );

      await this.runTest("get_graph_stats - Get graph statistics", "get_graph_stats", {}, (result) => ({
        valid: result && result.entities && typeof result.entities.total === "number",
        error: "Stats not found",
      }));

      // ========== QUERY OPERATIONS ==========
      this.log(`\n${"─".repeat(80)}`, "yellow");
      this.log("QUERY OPERATIONS", "yellow");
      this.log("─".repeat(80), "yellow");

      const graphResult = await this.runTest(
        "get_graph - Get all entities and relationships",
        "get_graph",
        { limit: 10 },
        (result) => ({
          valid: result && Array.isArray(result.entities),
          error: "Graph data not found",
        }),
      );

      let testEntityId = null;
      if (graphResult?.entities && graphResult.entities.length > 0) {
        testEntityId = graphResult.entities[0].id;
      }

      await this.runTest(
        "list_file_entities - List entities in a file",
        "list_file_entities",
        { filePath: "src/index.ts" },
        (result) => ({
          valid: result && Array.isArray(result.entities),
          error: "File entities not found",
        }),
      );

      if (testEntityId) {
        await this.runTest(
          "list_entity_relationships - List entity relationships",
          "list_entity_relationships",
          { entityName: testEntityId },
          (result) => ({
            valid: result !== null,
            error: "Relationships query failed",
          }),
        );
      }

      await this.runTest(
        "query - Execute graph query",
        "query",
        { query: "find all functions", limit: 5 },
        (result) => ({
          valid: result !== null,
          error: "Query execution failed",
        }),
      );

      // ========== SEMANTIC OPERATIONS ==========
      this.log(`\n${"─".repeat(80)}`, "yellow");
      this.log("SEMANTIC OPERATIONS", "yellow");
      this.log("─".repeat(80), "yellow");

      await this.runTest(
        "semantic_search - Search code semantically",
        "semantic_search",
        { query: "database connection", limit: 5 },
        (result) => ({
          valid: result && Array.isArray(result.items),
          error: "Semantic search failed",
        }),
      );

      await this.runTest(
        "find_similar_code - Find similar code patterns",
        "find_similar_code",
        { code: "function test() { return 42; }", threshold: 0.7, limit: 5 },
        (result) => ({
          valid: result !== null,
          error: "Similar code search failed",
        }),
      );

      await this.runTest(
        "detect_code_clones - Detect code clones",
        "detect_code_clones",
        { minSimilarity: 0.8 },
        (result) => ({
          valid: result && result.semantic !== undefined && result.jscpd !== undefined,
          error: "Clone detection failed",
        }),
      );

      await this.runTest(
        "cross_language_search - Search across languages",
        "cross_language_search",
        { query: "authentication", languages: ["typescript", "javascript"] },
        (result) => ({
          valid: result !== null,
          error: "Cross-language search failed",
        }),
      );

      await this.runTest(
        "find_related_concepts - Find related concepts",
        "find_related_concepts",
        { entityId: testEntityId || "test", limit: 5 },
        (result) => ({
          valid: result !== null,
          error: "Related concepts search failed",
        }),
      );

      // ========== ANALYSIS OPERATIONS ==========
      this.log(`\n${"─".repeat(80)}`, "yellow");
      this.log("ANALYSIS OPERATIONS", "yellow");
      this.log("─".repeat(80), "yellow");

      if (testEntityId) {
        await this.runTest(
          "analyze_code_impact - Analyze change impact",
          "analyze_code_impact",
          { entityId: testEntityId },
          (result) => ({
            valid: result && result.riskLevel !== undefined && Array.isArray(result.directImpacts),
            error: "Impact analysis failed",
          }),
        );
      }

      await this.runTest(
        "analyze_hotspots - Analyze code hotspots",
        "analyze_hotspots",
        { metric: "complexity", limit: 5 },
        (result) => ({
          valid: result?.hotspots && Array.isArray(result.hotspots),
          error: "Hotspot analysis failed",
        }),
      );

      await this.runTest(
        "suggest_refactoring - Get refactoring suggestions",
        "suggest_refactoring",
        { filePath: "src/index.ts" },
        (result) => ({
          valid: result && result.filePath !== undefined,
          error: "Refactoring suggestions failed",
        }),
      );

      // ========== MONITORING OPERATIONS ==========
      this.log(`\n${"─".repeat(80)}`, "yellow");
      this.log("MONITORING OPERATIONS", "yellow");
      this.log("─".repeat(80), "yellow");

      await this.runTest("get_metrics - Get performance metrics", "get_metrics", {}, (result) => ({
        valid: result && result.resources !== undefined,
        error: "Metrics not found",
      }));

      await this.runTest("get_agent_metrics - Get agent telemetry", "get_agent_metrics", {}, (result) => ({
        valid: result && typeof result.timestamp !== "undefined",
        error: "Agent metrics not found",
      }));

      await this.runTest("get_bus_stats - Get knowledge bus statistics", "get_bus_stats", {}, (result) => ({
        valid: result && typeof result.topicCount !== "undefined",
        error: "Bus stats not found",
      }));

      await this.runTest(
        "clear_bus_topic - Clear knowledge bus topic",
        "clear_bus_topic",
        { topic: "test:topic" },
        (result) => ({
          valid: result && result.success !== false,
          error: "Clear bus topic failed",
        }),
      );

      // ========== MAINTENANCE OPERATIONS ==========
      this.log(`\n${"─".repeat(80)}`, "yellow");
      this.log("MAINTENANCE OPERATIONS", "yellow");
      this.log("─".repeat(80), "yellow");

      await this.runTest(
        "clean_index - Clean and reindex",
        "clean_index",
        { directory: TEST_PROJECT_DIR },
        (result) => ({
          valid: result !== null,
          error: "Clean index failed",
        }),
      );

      // Note: reset_graph is destructive, so we'll skip it in automated tests
      this.results.total++;
      this.results.skipped++;
      this.results.tests.push({
        name: "reset_graph - Reset graph database",
        method: "reset_graph",
        status: "SKIP",
        reason: "Destructive operation - skipped in automated tests",
      });
      this.log("\n📝 Testing: reset_graph - Reset graph database", "blue");
      this.log("   ⏭️  SKIPPED (destructive operation)", "yellow");
    } catch (error) {
      this.log(`\n❌ Fatal error: ${error.message}`, "red");
    } finally {
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
    }
  }

  generateReport() {
    this.log(`\n${"=".repeat(80)}`, "cyan");
    this.log("TEST SUMMARY", "cyan");
    this.log(`${"=".repeat(80)}\n`, "cyan");

    const passRate = ((this.results.passed / (this.results.total - this.results.skipped)) * 100).toFixed(1);

    this.log(`Total Tests:    ${this.results.total}`, "reset");
    this.log(`✅ Passed:      ${this.results.passed}`, "green");
    this.log(`❌ Failed:      ${this.results.failed}`, this.results.failed > 0 ? "red" : "reset");
    this.log(`⏭️  Skipped:     ${this.results.skipped}`, "yellow");
    this.log(`📊 Pass Rate:   ${passRate}%\n`, passRate >= 90 ? "green" : passRate >= 70 ? "yellow" : "red");

    // Detailed results
    if (this.results.failed > 0) {
      this.log("─".repeat(80), "red");
      this.log("FAILED TESTS:", "red");
      this.log("─".repeat(80), "red");

      this.results.tests
        .filter((t) => t.status === "FAIL")
        .forEach((test) => {
          this.log(`\n❌ ${test.name}`, "red");
          this.log(`   Method: ${test.method}`, "reset");
          this.log(`   Error: ${test.error}`, "red");
        });
    }

    // Save report to file
    const reportPath = ".memory_bank/testing/mcp_method_test_results.json";
    try {
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(
        reportPath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            summary: {
              total: this.results.total,
              passed: this.results.passed,
              failed: this.results.failed,
              skipped: this.results.skipped,
              passRate: parseFloat(passRate),
            },
            tests: this.results.tests,
          },
          null,
          2,
        ),
      );

      this.log(`\n📄 Detailed report saved to: ${reportPath}`, "cyan");
    } catch (error) {
      this.log(`\n⚠️  Could not save report: ${error.message}`, "yellow");
    }

    this.log(`\n${"=".repeat(80)}\n`, "cyan");
  }
}

// Run tests
const tester = new MCPTester();
tester
  .runAllTests()
  .then(() => {
    tester.generateReport();
    process.exit(tester.results.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
