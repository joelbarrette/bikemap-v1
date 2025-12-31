
import os
import json
import re
'''
    For the given path, get the List of all files in the directory tree 
'''
def getListOfFiles(dirName):
    # create a list of file and sub directories 
    # names in the given directory 
    listOfFile = os.listdir(dirName)
    allFiles = list()
    # Iterate over all the entries
    for entry in listOfFile:
        # Create full path
        fullPath = os.path.join(dirName, entry)
        # If entry is a directory then get the list of files in this directory 
        if os.path.isdir(fullPath):
            allFiles = allFiles + getListOfFiles(fullPath)
        else:
            allFiles.append(fullPath)
                
    return allFiles

def main():
    
    dirName = '.'
    
    # Get the list of all files in directory tree at given path
    listOfFiles = getListOfFiles(dirName)
    
    # Print the files
    
    # Get the list of all files in directory tree at given path
    listOfFiles = list()
    for (dirpath, dirnames, filenames) in os.walk(dirName):
        listOfFiles += [os.path.join(dirpath, file) for file in filenames]
        
        
    # Print the files    
    b = []
    for elem in sorted(listOfFiles):
        if re.search('\.gpx', elem):   
            a = {
            'path': elem[2:],
            'type': elem.split('/')[1].strip()
            }
            b.append(a)
         
    # Write to folder.json
    with open('folder.json', 'w', encoding='utf-8') as f:
        json.dump(b, f)
    
    print(f'Successfully wrote {len(b)} GPX entries to folder.json')
        
        
        
        
if __name__ == '__main__':
    main()