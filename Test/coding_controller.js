const express = require("express");
const Code = require("./coding_schema");
const router = express.Router();
const cors = require("cors");
const axios = require("axios");
router.use(cors());

// Utility function for handling errors
const handleError = (res, error, customMessage = "Server Error") => {
  console.error("Error:", error);
  res.status(500).json({ success: false, msg: customMessage });
};

router.post("/add_code", async (req, res) => {
  const { code_problem_statement, code_test_cases_id, code_tags } = req.body;

  if (!code_problem_statement || code_tags.length === 0) {
    return res.status(400).json({
      success: false,
      msg: "Invalid input: Problem statement and test cases are required",
    });
  }

  try {
    // Check if `code_problem_statement` already exists
    const existingCode = await Code.findOne({ code_problem_statement });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        msg: "Problem statement already exists",
      });
    }

    const newCode = new Code({
      code_problem_statement,
      code_test_cases_id, // Can have duplicate test case IDs
      code_tags: code_tags || [], // Can have duplicate tags
    });

    const savedCode = await newCode.save();
    res.status(201).json({
      success: true,
      msg: "Code created successfully",
      data: savedCode,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: "Duplicate code_id detected, please try again.",
      });
    }
    handleError(res, error);
  }
});

router.get("/get_allCodes", async (req, res) => {
  try {
    const codes = await Code.find();
    res.status(200).json({ success: true, codes });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/get_code_by_id/:code_id", async (req, res) => {
  const { code_id } = req.params;

  if (!code_id) {
    return res.status(400).json({ success: false, msg: "code_id is required" });
  }

  try {
    const code = await Code.findOne({ code_id });

    if (!code) {
      return res.status(404).json({ success: false, msg: "Code not found" });
    }

    res.status(200).json({ success: true, data: code });
  } catch (error) {
    console.error("Fetch Error:", error); //  Log actual error
    res
      .status(500)
      .json({ success: false, msg: "Server Error", error: error.message });
  }
});

router.put("/update_code", async (req, res) => {
  const { code_id, code_test_cases_id, code_tags, ...updateData } = req.body;

  if (!code_id) {
    return res.status(400).json({ success: false, msg: "code_id is required" });
  }

  try {
    const code = await Code.findOne({ code_id });
    if (!code) {
      return res.status(404).json({ success: false, msg: "Code not found" });
    }

    //  Update test cases if provided
    if (code_test_cases_id) {
      const newTestCases = Array.isArray(code_test_cases_id)
        ? code_test_cases_id
        : [code_test_cases_id];
      code.code_test_cases_id = [
        ...new Set([...code.code_test_cases_id, ...newTestCases]),
      ]; // Prevent duplicates
    }

    //  Update tags if provided
    if (code_tags) {
      const newTags = Array.isArray(code_tags) ? code_tags : [code_tags];
      code.code_tags = [...new Set([...code.code_tags, ...newTags])]; // Prevent duplicates
    }

    Object.assign(code, updateData);
    await code.save();

    res
      .status(200)
      .json({ success: true, msg: "Code updated successfully", code });
  } catch (error) {
    console.error("Update Error:", error); //  Log the actual error
    res
      .status(500)
      .json({ success: false, msg: "Server Error", error: error.message });
  }
});

router.delete("/delete_code/:code_id", async (req, res) => {
  const { code_id } = req.params;

  if (!code_id) {
    return res.status(400).json({ success: false, msg: "code_id is required" });
  }

  try {
    const deletedCode = await Code.findOneAndDelete({ code_id });

    if (!deletedCode) {
      return res.status(404).json({ success: false, msg: "Code not found" });
    }

    res.status(200).json({ success: true, msg: "Code deleted successfully" });
  } catch (error) {
    handleError(res, error);
  }
});

// ✅ Correct local Piston URL
const PISTON_API_URL = "http://localhost:2000/api/v2/execute";

// Helper to get filename
function getFileName(language) {
  const fileNames = {
    javascript: "code.js",
    js:         "code.js",
    python:     "code.py",
    python3:    "code.py",
    java:       "Main.java",
    cpp:        "code.cpp",
    "c++":      "code.cpp",
    c:          "code.c",
  };
  return fileNames[language.toLowerCase()] || "code.txt";
}

router.post("/compiler", async (req, res) => {
  try {
    const { language, code, testCases } = req.body;

    if (!language || !code || !testCases || !Array.isArray(testCases)) {
      return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    const languageMap = {
      javascript: { language: "javascript", version: "18.15.0" },
      js:         { language: "javascript", version: "18.15.0" },
      python:     { language: "python",     version: "3.10.0"  },
      python3:    { language: "python",     version: "3.10.0"  },
      java:       { language: "java",       version: "15.0.2"  },
      cpp:        { language: "c++",        version: "10.2.0"  },
      "c++":      { language: "c++",        version: "10.2.0"  },
      c:          { language: "c",          version: "10.2.0"  },
    };

    const pistonLanguage = languageMap[language.toLowerCase()];
    if (!pistonLanguage) {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    const results = [];

    for (const testCase of testCases) {
      const input = testCase.input || "";
      const expectedOutput = testCase.expectedOutput || testCase.output || "";

      if (expectedOutput === undefined) {
        return res.status(400).json({ error: "Test case missing expectedOutput or output" });
      }

      const payload = {
        language: pistonLanguage.language,  // ✅ string not object
        version:  pistonLanguage.version,   // ✅ exact version not '*'
        files: [
          {
            name:    getFileName(language), // ✅ filename tells gcc C vs C++
            content: code,
          },
        ],
        stdin:           input,
        args:            [],
        compile_timeout: 10000,
        run_timeout:     3000,
      };

      let response;
      try {
        response = await axios.post(PISTON_API_URL, payload);
      } catch (apiError) {
        console.error(`Piston API error for test case:`, apiError.message);
        results.push({
          input,
          expectedOutput,
          actualOutput: `API Error: ${apiError.message}`,
          passed: false,
        });
        continue;
      }

      const runData     = response.data.run     || {};
      const compileData = response.data.compile || {};

      let output = (runData.stdout || "").trim();
      const errorOutput  = (runData.stderr    || "").trim();
      const compileError = (compileData.stderr || "").trim();

      if (compileError) {
        output = compileError;
      } else if (errorOutput) {
        output = errorOutput;
      }

      const passed = output === expectedOutput.trim();

      results.push({
        input,
        expectedOutput,
        actualOutput: output,
        passed,
      });
    }

    res.json({ success: true, results });

  } catch (error) {
    console.error("Error executing code:", error.message, error.stack);
    res.status(500).json({
      error:   "Failed to execute code",
      details: error.message,
    });
  }
});

module.exports = router;
