const url = "http://localhost:3000/register";
const getData = async () => {
  const options = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      username: "adam_richard",
      password: "richard_567",
      name: "Adam Richard",
      gender: "male",
    }),
  };
  const res1 = await fetch(url, options);
  const data = res1.json();
  console.log(data);
};
getData();
