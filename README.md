# Server Installation Guide

## Introduction
This guide will walk you through the installation process of the Political-Transparency server and the configuration of its connection to the database.

## Prerequisites
Before you begin, make sure you have the following prerequisites:

1. **Node.js and npm:** Ensure you have Node.js (v18.13.0) and npm (v8.19.3) installed on your system. You can download them from nodejs.org.
2. **GitHub Account:** You'll need a GitHub account to access the repository and download the code.
3. **MySql Server:** You'll need to configure MySql server on the local machine see the next tutorial for it: https://www.javatpoint.com/how-to-install-mysql

## Step 1: Cloning the Repository
1. Open your terminal and navigate to the directory where you want to clone the repository:

      **`cd /path/to/your/directory`**

2. Clone the Political-Transparency repository from GitHub:

    **`https://github.com/Political-Transparency/server`**
   
3. Navigate to the project directory:

   **`cd server`**

## Step 2: Setting Up the Server
1. Install the required dependencies by running the following command:

     **`npm install`**
2. On your local host machine, open you'r local MySql Server and configure a new scheme called "knesset".
   

3. Create .env file in the root folder of the server and to use MySQL Cloud or Local Server and update with your MySql credentials:
   
   ![image](https://github.com/Political-Transparency/server/assets/73185009/183a912e-13a5-454f-8ae9-85dfa8be3535)

<b>Note:<b> .env file should be in a common file for client and server repos.
   

## Step 3: Starting the Server (Initial Setup)
After configuring the server settings, you can initiate it by running the following command:

npm start

The server will commence operation on the specified port (the default is 8080). You can access it via your web browser or through tools such as Postman.

During the initial server startup, a script will execute to initialize the schema and tables. Additionally, it will inject the latest updates from the Knesset API into our MySQL server. Please note that for the first-time setup, this process may take up to 10 minutes to complete.


## Conclusion

You've successfully installed the Political-Transparency server and configured the connection to your Cloud MySQL database. You can now use the provided APIs to interact with the server and the database. Make sure to explore the available routes and customize the server to meet your specific requirements.

Remember to follow best practices for security and error handling as you work on your project. If you encounter any issues or have questions, feel free to refer to the project documentation or reach out to our support team.

Happy coding!
