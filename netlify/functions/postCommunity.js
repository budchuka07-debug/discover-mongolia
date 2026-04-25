
exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

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
        message: "Error processing request"
      })
    };
  }
};
