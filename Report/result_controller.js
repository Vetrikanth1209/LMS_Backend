const express = require("express");
const router = express.Router();
const Result = require("./result_schema");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");


// Load .env
require("dotenv").config();


// **GET - Fetch All Results**
router.get("/get-result", async (req, res) => {
  try {
    const results = await Result.find();
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Error fetching results", error });
  }
});

router.get("/get-result-by-result-id/:result_test_id", async (req, res) => {
  try {
    const result = await Result.findOne({ result_test_id: req.params.result_test_id });
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error fetching results", error });
  }
});

// **POST - Add a New Result**

router.post("/post-result", async (req, res) => {
  try {
    const {
      result_user_id,
      result_test_id,
      result_score,
      result_total_score,
      result_poc_id,
      result_mcq_score,
      result_coding_score,
    } = req.body;

    // Validate required fields
    if (
      !result_user_id ||
      !result_test_id ||
      result_score == null ||
      result_total_score == null ||
      !result_poc_id ||
      result_mcq_score == null ||
      !result_coding_score ||
      result_coding_score.score == null ||
      result_coding_score.testcases_passed == null
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check for duplicate entry
    const existingResult = await Result.findOne({ result_user_id, result_test_id });
    if (existingResult) {
      return res.status(409).json({ message: "Result already exists for this user and test" });
    }

    const result_id = uuidv4();

    const newResult = new Result({
      result_id,
      result_user_id,
      result_test_id,
      result_score,
      result_total_score,
      result_poc_id,
      result_mcq_score,
      result_coding_score: {
        score: result_coding_score.score,
        testcases_passed: result_coding_score.testcases_passed,
      },
    });

    await newResult.save();

    res.status(201).json({ message: "Result stored successfully", result: newResult });
  } catch (error) {
    console.error("Error saving result:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});
// BULK RESULT POST

router.post("/post-bulk-results", async (req, res) => {
  try {
    const results = req.body; // Expecting an array of result objects

    // Validate input
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: "Request body must be a non-empty array of results" });
    }

    // Validate each result object and add result_id
    const validatedResults = results.map((result) => {
      const { result_user_id, result_test_id, result_score, result_total_score, result_poc_id } = result;

      if (!result_user_id || !result_test_id || result_score == null || result_total_score == null || !result_poc_id) {
        throw new Error(`Missing required fields in result: ${JSON.stringify(result)}`);
      }

      return {
        result_id: uuidv4(),
        result_user_id,
        result_test_id,
        result_score,
        result_total_score,
        result_poc_id,
      };
    });

    // Insert all results into the database
    const savedResults = await Result.insertMany(validatedResults);

    res.status(201).json({
      message: " Bulk results stored successfully",
      count: savedResults.length,
      results: savedResults,
    });
  } catch (error) {
    console.error(" Error saving bulk results:", error.message);
    res.status(400).json({ message: "Error processing bulk results", error: error.message });
  }
});

// Submit test 
router.post("/submit_result", async (req, res) => {
  try {
    const { result_user_id, result_test_id, result_score, result_total_score, result_poc_id, result_id } = req.body;

    // Validate required fields
    if (!result_user_id || !result_test_id || result_score == null || result_total_score == null || !result_poc_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check for duplicate entry
    const existingResult = await Result.findOne({
      result_user_id,
      result_test_id
    });

    if (existingResult) {
      return res.status(409).json({ message: "Result already exists for this user and test" });
    }

    // Use provided result_id or generate a new UUID
    const final_result_id = result_id || uuidv4();

    // Store in database
    const newResult = new Result({
      result_id: final_result_id,
      result_user_id,
      result_test_id,
      result_score,
      result_total_score,
      result_poc_id,
    });

    await newResult.save();

    res.status(201).json({ message: "Result stored successfully", result: newResult });
  } catch (error) {
    console.error("Error submitting result:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});



//  PUT - Update an existing result
router.put("/update-result", async (req, res) => {
  try {
    const { result_id, ...updateData } = req.body;

    if (!result_id) {
      return res.status(400).json({ message: "result_id is required for update" });
    }

    const updatedResult = await Result.findOneAndUpdate(
      { result_id },
      updateData,
      { new: true }
    );

    if (!updatedResult) {
      return res.status(404).json({ message: "Result not found" });
    }

    res.json({ message: " Result updated successfully", result: updatedResult });
  } catch (error) {
    res.status(500).json({ message: "Error updating result", error });
  }
});



// **DELETE - Remove a Result**
router.delete("/delete-by-result-id/:result_id", async (req, res) => {
  try { 
    const { result_id } = req.params;

    const deletedResult = await Result.findOneAndDelete({ result_id });

    if (!deletedResult) {
      return res.status(404).json({ message: "Result not found" });
    }

    res.json({ message: " Result deleted successfully", result: deletedResult });
  } catch (error) {
    res.status(500).json({ message: "Error deleting result", error });
  }
});


// **GET - Fetch Result Scores by result_user_id**
router.get("/get-result-by-user/:result_user_id", async (req, res) => {
  try {
    const { result_user_id } = req.params;

    // Fetch all results for the user with full data
    const results = await Result.find({ result_user_id });

    if (results.length === 0) {
      return res.status(404).json({ message: "No results found for this user" });
    }

    // Return just the raw result documents
    res.json(results);

  } catch (error) {
    res.status(500).json({ message: "Error fetching results", error });
  }
});


router.get('/results/check', async (req, res) => {
  try {
    const { user_id, test_id } = req.query;

    // Query your database to see if the result already exists
    const existingResult = await Result.findOne({
      result_user_id: user_id,
      result_test_id: test_id,
    });

    res.json({ exists: !!existingResult }); // true or false
  } catch (err) {
    console.error("Error checking for existing result:", err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET - Fetch Results by result_user_id and result_test_id
router.get("/get_result_by_user_id_test_id", async (req, res) => {
  const { result_user_id, result_test_id } = req.query;

  // Validate query parameters
  if (!result_user_id || !result_test_id) {
    return res.status(400).json({
      message: "Missing required query parameters: result_user_id and result_test_id",
    });
  }

  try {
    const results = await Result.find({
      result_user_id,
      result_test_id,
    });

    res.status(200).json(results); // Return the results (array)
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET route to fetch results by user ID
router.get('/get_results_by_user_and_poc/:userId/:pocId', async (req, res) => {
  try {
    const { userId, pocId } = req.params;

    // Find all results for the specified user ID and POC ID
    const results = await Result.find({ 
      result_user_id: userId,
      result_poc_id: pocId 
    });

    // If no results found
    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No results found for user ID: ${userId} and POC ID: ${pocId}`
      });
    }

    // Return successful response with results
    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    // Handle any errors
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching results',
      error: error.message
    });
  }
});

router.get('/aggregate_scores/:poc_id/:user_id', async (req, res) => {
  try {
    const { poc_id, user_id } = req.params;
    const token = req.headers.authorization; // Get client-provided token
    console.log(`Processing aggregate_scores for poc_id: ${poc_id}, user_id: ${user_id}`);

    if (!token) {
      console.log('No authorization token provided');
      return res.status(401).json({ message: 'Access token is missing' });
    }

    let testsResponse;
    try {
      testsResponse = await axios.get(`${ServiceAddress}/api/tests_till_today/${poc_id}`, {
        headers: { Authorization: token }, // Forward client token
      });
    } catch (error) {
      console.error(`Error fetching tests for poc_id ${poc_id}:`, error.message);
      if (error.response) {
        console.error(`Response Data:`, error.response.data);
        console.error(`Response Status:`, error.response.status);
      }
      throw new Error(`Failed to fetch tests: ${error.message}`);
    }
    const testIds = testsResponse.data.tests_till_today?.map(test => test.test_id) || [];
    console.log(`Fetched ${testIds.length} test IDs:`, testIds);

    if (!testIds.length) {
      console.log(`No tests found for poc_id: ${poc_id}`);
      return res.status(200).json({
        message: 'No tests found for this POC',
        response: { tests: [], total_result_score: 0, total_test_score: 0, average_percentage: 0 }
      });
    }


    const results = await Promise.all(
      testIds.map(async (test_id) => {
        let test_total_score = 0;
        try {
          const testResponse = await axios.get(`${ServiceAddress}/api/get_by_test_id/${test_id}`, {
            headers: { Authorization: token }, // Forward client token
          });
          test_total_score = testResponse.data.test_total_score || 0;
        } catch (error) {
          console.error(`Error fetching test ${test_id}:`, error.message);
          if (error.response) {
            console.error(`Response Data:`, error.response.data);
            console.error(`Response Status:`, error.response.status);
          }
          test_total_score = 0;
        }

        let result_score = 0;
        try {
          const resultResponse = await axios.get(
            `${ServiceAddress}/api/get_result_by_user_id_test_id?result_user_id=${user_id}&result_test_id=${test_id}`,
            {
              headers: { Authorization: token }, // Forward client token
            }
          );
          result_score = resultResponse.data[0]?.result_score || 0;
        } catch (error) {
          console.log(`No result found for test_id ${test_id}, user_id ${user_id}`);
          if (error.response) {
            console.error(`Error fetching result for test ${test_id}:`, error.response.data);
            console.error(`Response Status:`, error.response.status);
          }
          result_score = 0;
        }

        const percentage = test_total_score > 0 ? (result_score / test_total_score) * 100 : 0;

        try {
          const testName = await axios.get(`${ServiceAddress}/api/test_details/${test_id}`, {
            headers: { Authorization: token }, // Forward client token
          });
          const test_name = testName.data.test_name || `Test ${test_id}`;
          return { test_id, test_name, test_total_score, result_score, percentage };

        } catch (error) {
          console.error(`Error fetching test details for test_id ${test_id}:`, error.message);
        }

        
      })
    );

    const total_result_score = results.reduce((sum, r) => sum + r.result_score, 0);
    const total_test_score = results.reduce((sum, r) => sum + r.test_total_score, 0);
    const average_percentage = total_test_score > 0 ? (total_result_score / total_test_score) * 100 : 0;


    const userDetails = await axios.get(`${ServiceAddress}/api/get_user_by_id/${user_id}`, {
      headers: { Authorization: token }, // Forward client token
    });
    console.log(`Fetched user details for user_id ${user_id}:`, userDetails.data);

    res.status(200).json({
      message: 'Scores aggregated successfully',
      response: { tests: results, total_result_score, total_test_score, average_percentage , userDetails: userDetails.data }
    });
  } catch (error) {
    console.error('Error in aggregate_scores:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
      console.error('Response Status:', error.response.status);
    }
    res.status(500).json({ message: 'Error aggregating scores', error: error.message });
  }
});


const ServiceAddress = process.env.ServiceAddress;

if (!ServiceAddress) {
  console.error("❌ Missing ServiceAddress in .env file");
  process.exit(1);
}

router.get('/fetch_details/:org_id/:mod_id/:mod_poc_id', async (req, res) => {
  try {
    const { org_id, mod_id, mod_poc_id } = req.params;
    const token = req.headers.authorization;

    // Construct target URLs (NO ServicePort here, because it's already in .env)
    const orgUrl = `${ServiceAddress}/api/get_org_by_id/${org_id}`;
    const modUrl = `${ServiceAddress}/api/get_module_by_id/${mod_id}`;
    const pocUrl = `${ServiceAddress}/api/get_poc_by_poc_id/${mod_poc_id}`;

    // Fetch details from each service concurrently
    const [orgResponse, modResponse, pocResponse] = await Promise.all([
      axios.get(orgUrl).catch(err => ({ error: err.message })),
      axios.get(modUrl).catch(err => ({ error: err.message })),
      axios.get(pocUrl).catch(err => ({ error: err.message })),
    ]);

    // Check for errors in responses
    if (orgResponse.error || modResponse.error || pocResponse.error) {
      const errors = [];
      if (orgResponse.error) errors.push(`Organization: ${orgResponse.error}`);
      if (modResponse.error) errors.push(`Module: ${modResponse.error}`);
      if (pocResponse.error) errors.push(`POC: ${pocResponse.error}`);
      if (errors.every(err => err.includes('status code 404'))) {
        return res.status(404).json({ message: 'One or more resources not found', errors });
      }
      return res.status(500).json({ message: 'Error fetching details', errors });
    }

    // Parse mod_tests from pocResponse
    const modTests = pocResponse.data.mod_tests
      ? pocResponse.data.mod_tests.map((test, index) => ({
          test_id: test.test_id,
          assigned_date: test.assigned_date,
          name: `Test ${index + 1}`, // Default name, to be updated
          test_language: null,
          test_total_score: null,
          activeAt: test.assigned_date,
        }))
      : [];

    // Fetch test details for each test_id
    const testDetailsPromises = modTests.map((test) =>
      axios
        .get(`${ServiceAddress}/api/test_details/${test.test_id}`, {
          headers: { Authorization: token },
        })
        .then((res) => ({
          test_id: test.test_id,
          name: res.data.test_name || `Test ${modTests.indexOf(test) + 1}`,
          test_language: res.data.test_language || null,
          test_total_score: res.data.test_total_score || null,
          activeAt: res.data.activeAt || test.assigned_date,
        }))
        .catch((err) => ({
          test_id: test.test_id,
          name: `Test ${modTests.indexOf(test) + 1}`,
          test_language: null,
          test_total_score: null,
          activeAt: test.assigned_date,
          error: err.message,
        }))
    );

    const testDetails = await Promise.all(testDetailsPromises);
    console.log("Test details:", testDetails);

    // Update mod_tests with test details
    const updatedModTests = modTests.map((test) => {
      const details = testDetails.find((td) => td.test_id === test.test_id) || {};
      return {
        test_id: test.test_id,
        assigned_date: test.assigned_date,
        name: details.name || test.name,
        test_language: details.test_language,
        test_total_score: details.test_total_score,
        activeAt: details.activeAt,
      };
    });

    // Fetch user details and aggregate scores for each mod_users ID
    const modUsers = pocResponse.data.mod_users || [];
    let userScores = [];

    if (modUsers.length > 0) {
      const promises = modUsers.map((userId) =>
        Promise.all([
          axios
            .get(`${ServiceAddress}/api/get_user_by_id_for_name/${userId}`)
            .catch((err) => ({ error: err.message, userId })),
          axios
            .get(`${ServiceAddress}/api/aggregate_scores/${mod_poc_id}/${userId}`, {
              headers: { Authorization: token },
            })
            .catch((err) => ({ error: err.message, userId })),
        ])
      );

      const responses = await Promise.all(promises);

      userScores = responses.map(([userResp, scoreResp], index) => {
        const userId = modUsers[index];
        let result = { userId };

        // Handle user details
        if (userResp.error) {
          result.error = userResp.error;
        } else {
          result.name = typeof userResp.data === 'string' ? userResp.data : userResp.data.name || 'Unknown';
        }

        // Handle scores and merge test details
        if (scoreResp.error) {
          result.error = result.error ? `${result.error}, Scores: ${scoreResp.error}` : scoreResp.error;
        } else {
          const tests = Array.isArray(scoreResp.data.response.tests)
            ? scoreResp.data.response.tests.map((test) => {
                const testDetail = testDetails.find((td) => td.test_id === test.test_id) || {};
                return {
                  test_id: test.test_id,
                  test_total_score: testDetail.test_total_score || test.test_total_score || 0,
                  result_score: test.result_score || 0,
                  percentage: test.percentage || 0,
                  name: testDetail.name || `Test ${index + 1}`,
                  assigned_date: testDetail.activeAt || '',
                  test_language: testDetail.test_language || null,
                };
              })
            : [];
          result.scores = {
            ...scoreResp.data.response,
            tests,
            aggregate_score: scoreResp.data.response.aggregate_score || 100,
          };
        }

        return result;
      });

      console.log(`Combined user scores: ${JSON.stringify(userScores)}`);
    }

    // Compute test_wise_total_result
    const testWiseTotalResult = updatedModTests.map((test) => {
      const testScores = userScores
        .filter((user) => !user.error) // Exclude users with errors
        .flatMap((user) =>
          (user.scores?.tests || []).filter((t) => t.test_id === test.test_id)
        );

      const num_students_attended = testScores.length;
      const total_result_score = testScores.reduce((sum, t) => sum + (t.result_score || 0), 0);
      const total_percentage = testScores.reduce((sum, t) => sum + (t.percentage || 0), 0);

      return {
        test_id: test.test_id,
        test_name: test.name,
        test_activeAt: test.activeAt,
        test_total_score: test.test_total_score || 0,
        average_mark: num_students_attended > 0 ? total_result_score / num_students_attended : 0,
        num_students_attended,
        average_percentage: num_students_attended > 0 ? total_percentage / num_students_attended : 0,
      };
    });

    // Decompose responses
    const organizationDetails = {
      org_name: orgResponse.data.org_name || null,
      org_id: orgResponse.data.org_id || null,
    };

    const moduleDetails = {
      mod_name: modResponse.data.mod_name || null,
      mod_id: modResponse.data.mod_id || null,
      mod_duration: modResponse.data.mod_duration || null,
    };

    const pocDetails = {
      poc_name: pocResponse.data.mod_poc_name || null,
      poc_id: pocResponse.data.mod_poc_id || null,
      mod_users: modUsers,
      mod_tests: updatedModTests,
    };

    // Combine responses
    const result = {
      organization: organizationDetails,
      module: moduleDetails,
      poc: pocDetails,
      user_scores: userScores,
      test_details: {
        mod_tests: updatedModTests,
      },
      test_wise_total_result: testWiseTotalResult,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error(`Error in fetch_details: ${error.message}`);
    res.status(500).json({ message: 'Error fetching details', error: error.message });
  }
});




module.exports = router;