exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "postCommunity function is working. Please submit from the website form."
        })
      };
    }

    const data = JSON.parse(event.body || "{}");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Post received successfully",
        data
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message
      })
    };
  }
};
