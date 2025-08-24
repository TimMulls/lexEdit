### #1 rule. This is your project in the convertedCodeNuxt folder (you the AI not me the human) and you can do what you want with it. Once it gets closer to being converted then I will take more control over the code.

- If you want to change something, change it.
- If you want to add something, add it.
- If you want to remove something, remove it.
- You don't need to keep asking me if I want to make this change after I post the error logs. Just make the change. If I don't like it, I will let you know. If I do like it, I will let you know. If I don't say anything, assume I like it. The old code works fine the way it was, I just need to update it to be more modern and use Nuxt 4.
- You should not be telling me that my code is wrong becuase the old version of the code is working just fine and the new code ini the convertedCodeNuxt is 99% your converted code of my code so when there is an error it is on you not me as you most likly created that error when you tried to conver the app.
- Please check all the files you altered before telling me to test it, it seems like you mess up alot and put things in the wrong location and then tell me to test it and give you the error when you should be able to tell there was an error before you even asked me to test it!
- You should not change any code in the other two folders "OldCode" and "OldUIAndCompiledApp" unless I specifically tell you to do so.
- Only the single folder "convertedCodeNuxt" is your project and you can do what you want with it but only build in that folder not the project as a whole.

### #2 Rule, it works in the old code so it should work in the new code. If I tell you it is not working in the new code then you should refer back to the old code and make it work as this is your project, refer back to #1 rule.

### #3 Rule. I don't really case what you are doing and I don't need detailed logs in the chat explaining what you did right now in this process. You are doing it wrong 60% of the time so why would I care about how you programmed it incorrectly? At some point I will remove this rule and then you can provide me details about what you changed but right not it is just a waste of time for both of us.

# Rules for converting the code to a Nuxt 4 app

Folder OldCode is the code that needs to be converted to a Nuxt 4 app. The src folder contains all the logic for the editor and used to be compiled into a single file using webpack and put int the lexEdit2 (now called OldUIAndCompiledApp) dist folder. This is old code so you can updated it as needed and does not need to use the same versions in the project file if there is a better or different control to use.

Folder convertedCodeNuxt is where the new converted code will be located

Folder OldUIAndCompiledApp is where the old version of the app is located in the compiled state (int dist folder), it also contains the old version of the UI that was used in a a dotnet 4.8 app (lexEdit.ascx)

# Needs

Use PNPM
Use TailWindCSS v4
Needs to work with Nuxt 4 app
Old version of fabric.js is used in the old code, new code is using latest version of fabric.js so there might be some changes needed to the code to work with the new version of fabric.js!

Look at TODO.md for more details on what needs to be done stil in the conversion process.

# Example Data

Call
https://agentzmarketing.com//DesktopModules/EditorServices/API/LexEditor/GetOrderVars?enc=GfvDUvQADLFB5yfbdXfyiq%2FqnzxoJRbWLJ4aW2C2kzUuFRiq3cJpQUg9jrtXUMp5LHpGYZ9VDRiSssgxQMZNqXqmT6Zu133CyZ2GseENrS7F9YDX%2BosNMEfGZWYvvYJ15AJuxWOq3F034O96G1DRNhB%2BW5j%2BOEZr84kIszeYeUNJGLfWuaeRFhXjWSaYj4Ab582LrAF9Rx3SqY0jrksugA%3D%3D

Call
https://agentzmarketing.com//DesktopModules/EditorServices/API/LexEditor/GetOrderData?orderNumber=292813&userId=0&sessionId=c2sezknxivfmtjg0tt4uqxro



git remote add origin git@github.com:TimMulls/lexEdit.git
git branch -M main
git push -u origin main