"use server"

import { Octokit } from "octokit"

// GitHub repository information from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ""
const REPO_OWNER = process.env.REPO_OWNER || ""
const REPO_NAME = process.env.REPO_NAME || ""

// Initialize Octokit with the GitHub token (optional for public repos)
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
})

export interface PlanningFile {
  id: string
  name: string
  path: string
  downloadUrl: string
  publishedAt: string
}

/**
 * Fetches all planning files from the GitHub repository
 */
export async function fetchPlanningFiles(): Promise<PlanningFile[]> {
  try {
    console.log(`Fetching files from ${REPO_OWNER}/${REPO_NAME} (public repository)`)

    // Get the default branch
    const repoResponse = await octokit.rest.repos.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
    })

    const defaultBranch = repoResponse.data.default_branch
    console.log(`Default branch: ${defaultBranch}`)

    // For public repositories, we can use the contents API directly
    const contentsResponse = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: "", // Root directory
    })

    console.log("Contents response:", JSON.stringify(contentsResponse.data, null, 2))

    // If we got a single file instead of a directory listing
    if (!Array.isArray(contentsResponse.data)) {
      console.log("Received a single file instead of directory contents")
      return await useFallbackMethod(defaultBranch)
    }

    // Find all CSV files in the root directory
    const csvFiles = contentsResponse.data
      .filter((item: any) => item.type === "file" && item.name.toLowerCase().endsWith(".csv"))
      .map((file: any) => ({
        id: Buffer.from(file.path).toString("base64").replace(/[+/=]/g, ""),
        name: file.name.replace(".csv", ""),
        path: file.path,
        downloadUrl: file.download_url,
        publishedAt: new Date().toLocaleDateString("fr-FR"), // We'll update this later
      }))

    // If no CSV files in root, try the fallback method
    if (csvFiles.length === 0) {
      console.log("No CSV files found in root directory, trying fallback method")
      return await useFallbackMethod(defaultBranch)
    }

    // Get commit information for each file to determine the published date
    const filesWithDates = await Promise.all(
      csvFiles.map(async (file) => {
        try {
          const commitResponse = await octokit.rest.repos.listCommits({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: file.path,
            per_page: 1,
          })

          if (commitResponse.data.length > 0) {
            const latestCommit = commitResponse.data[0]
            const publishedAt = latestCommit.commit.author?.date
              ? new Date(latestCommit.commit.author.date).toLocaleDateString("fr-FR")
              : new Date().toLocaleDateString("fr-FR")

            return {
              ...file,
              publishedAt,
            }
          }

          return file
        } catch (error) {
          console.error(`Error fetching commit info for ${file.path}:`, error)
          return file
        }
      }),
    )

    // Sort by published date (newest first)
    return filesWithDates.sort((a, b) => {
      const dateA = new Date(a.publishedAt.split("/").reverse().join("-"))
      const dateB = new Date(b.publishedAt.split("/").reverse().join("-"))
      return dateB.getTime() - dateA.getTime()
    })
  } catch (error) {
    console.error("Error fetching planning files:", error)

    // Try fallback method
    try {
      return await useFallbackMethod()
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError)

      // If all else fails, return mock data
      return [
        {
          id: "tasks-1c8d4f937e638190af1efbc2a32cf799",
          name: "Tasks 1c8d4f937e638190af1efbc2a32cf799",
          path: "sample/tasks.csv",
          downloadUrl:
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tasks%201c8d4f937e638190af1efbc2a32cf799-DxgwR4jquvHvZYnA33TADkgwl67XRl.csv",
          publishedAt: new Date().toLocaleDateString("fr-FR"),
        },
      ]
    }
  }
}

/**
 * Fallback method to find CSV files using the Git Trees API
 */
async function useFallbackMethod(defaultBranch?: string): Promise<PlanningFile[]> {
  console.log("Using fallback method to find CSV files")

  if (!defaultBranch) {
    // Get the default branch if not provided
    const repoResponse = await octokit.rest.repos.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
    })
    defaultBranch = repoResponse.data.default_branch
  }

  // Get all files in the repository using the Git Trees API
  const treeResponse = await octokit.rest.git.getTree({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tree_sha: defaultBranch,
    recursive: "1",
  })

  console.log(`Found ${treeResponse.data.tree.length} items in the repository`)

  // Filter for CSV files
  const csvFiles = treeResponse.data.tree
    .filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".csv"))
    .map((file) => ({
      id: Buffer.from(file.path).toString("base64").replace(/[+/=]/g, ""),
      name: file.path.split("/").pop()?.replace(".csv", "") || "Unknown",
      path: file.path,
      downloadUrl: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${defaultBranch}/${file.path}`,
      publishedAt: new Date().toLocaleDateString("fr-FR"),
    }))

  console.log(`Found ${csvFiles.length} CSV files`)

  return csvFiles
}

/**
 * Fetches a specific planning file from GitHub
 */
export async function fetchPlanningFile(id: string): Promise<{ url: string; name: string; publishedAt: string }> {
  try {
    // Get all planning files
    const files = await fetchPlanningFiles()

    // Find the file with the matching ID
    const file = files.find((f) => f.id === id)

    if (!file) {
      console.log(`File with ID ${id} not found, using sample file`)
      // If file not found, return the sample file
      return {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tasks%201c8d4f937e638190af1efbc2a32cf799-DxgwR4jquvHvZYnA33TADkgwl67XRl.csv",
        name: "Sample Planning",
        publishedAt: new Date().toLocaleDateString("fr-FR"),
      }
    }

    console.log(`Found file: ${file.name}, URL: ${file.downloadUrl}`)
    return {
      url: file.downloadUrl,
      name: file.name,
      publishedAt: file.publishedAt,
    }
  } catch (error) {
    console.error("Error fetching planning file:", error)
    // Return the sample file on error
    return {
      url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tasks%201c8d4f937e638190af1efbc2a32cf799-DxgwR4jquvHvZYnA33TADkgwl67XRl.csv",
      name: "Sample Planning",
      publishedAt: new Date().toLocaleDateString("fr-FR"),
    }
  }
}

/**
 * Validates and fetches the CSV content
 */
export async function validateAndFetchCsv(url: string): Promise<string> {
  console.log(`Validating and fetching CSV from: ${url}`)

  try {
    // First try a HEAD request to check if the URL is accessible
    const headResponse = await fetch(url, { method: "HEAD" })

    if (!headResponse.ok) {
      console.error(`HEAD request failed: ${headResponse.status} ${headResponse.statusText}`)
      throw new Error(`Failed to access CSV: ${headResponse.status} ${headResponse.statusText}`)
    }

    // If HEAD request succeeds, proceed with GET request
    const response = await fetch(url)

    if (!response.ok) {
      console.error(`GET request failed: ${response.status} ${response.statusText}`)
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    console.log(`Successfully fetched CSV (${text.length} bytes)`)
    return text
  } catch (error) {
    console.error("Error in validateAndFetchCsv:", error)
    throw error
  }
}
