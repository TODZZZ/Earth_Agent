We are creating a project named google earth engine agent. This is a chrome extension that is a chatbot that help you interact with google earth engine code editor. This is the introduction to google earth engine code editor： https://developers.google.com/earth-engine/guides/playground. Basically google earth engine is a code editor for creating maps. 

UI: 
When we open our extension, a side panel will appear on the right. The UI looks like the attached image1. THere is a login icon at the top right corner, there you can log onto our app using google accounts. At the bottom there is a chat box, in there the user would input the prompt. Then our earth agent will respond with a message that is the response and the code generated. There will also be a button that request user’s permission to run the generated code in the google earth engine code editor. the user can keep the conversation going by asking follow up questions and error messages.


Features:
Based on the prompt from the user, our AI app will use langraph and langchain to define different AI-agents, who will use different tools to complete the tasks from the user. For example: if the user ask for a map. First, the AI agent can search the available google earth database and choose the most appropriate one for this task. It will also generate code, debug the code if there is errors in the google earth engine console. It will also inspect the data shown on the map and summarize the maps and the charts.

Agents Design: 
We will have following agents using langgraph.js:
1. Planner: Analyze the prompt, make plans of specific tasks based on the prompt. Also it will evaluate whether the task can be done with the current google map database capability and data availability.
2. Database selector: based on the prompt and the instruction from the planner, access the google database catalogue and select the best databases for this task.
3. Code generator: based on the selected databases, generate the code for the google engine editor and run it to see the map rendering.
4. code debugger: will check if the code successfully run or not, if it has errors, it can fetch errors and modify the code according to the error message.
5. summarizer: will summarize the chats and the maps and give response to answer user’s questions.
6. coordinator and superviser: will coordinate and supervise the task execution, review and decide what agent to summon and what tool to call to accomplish the tasks.

Tools:
The following tools needs to be implemented and the agents will call these tools to accomplish the tasks:
1. Database search: search the google engine catelogue for relevant databases. https://github.com/samapriya/Earth-Engine-Datasets-List/blob/master/gee_catalog.json. 
2. Problem assessment: analyze the prompt, check the whether this problem can be fixed using the Google earth engine. RAG for GEE API, access the documentation of the google earth engine API, for the assessment.
3. Code_run: this will paste the generated code to the ACE editor of the google earth engine and run the map in Google earth engine.
4. Inspect: will click the inspector button in the GEE editor, click on the map and retrieve information from google earth engine editor.
5. Console: will click on the console to see the error message from the google earth engine editor.
6. Task: click the task button in the google earth engine editor to access the scripts and the files.
7. script edit: edit the scripts in the google earth engine code editor.


Framework and Stack

It will use Nodejs to build the codes for google chrome extension
It use next.js or vite.js based your knowledge and judgment 
it use langchain.js and langgraph.js for agent development and tool development
Use next.js or vite.js  for the UI or use other popular framework for chatbot
when using langchain.js, import things use “@langchain/langgraph.web”
you can debugging using console 

Keep in mind:
Give us some suggestions in terms of our design. Dont finish this in one go, lets develop this through iterations. First create a plan. If we approve, move ahead to develop the minimal viable prototype. If that works, move ahead with the remaining development. 
