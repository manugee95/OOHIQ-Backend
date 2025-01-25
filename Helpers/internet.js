const dns = require("dns");

exports.isOnline = (hostname = "google.com") => {
  return new Promise((resolve) => {
    dns.resolve(hostname, (err) => {
      if (err) {
        console.error(`DNS lookup failed for ${hostname}:`, err.message);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
