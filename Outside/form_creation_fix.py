# Backend Fix for Form Creation - Use MongoDB ObjectIds like Visitors

# CURRENT PROBLEMATIC CODE (what needs to be changed):
@app.post("/forms")
async def create_form(
    form_data: dict,
    current_device: dict = Depends(get_current_device)
):
    # PROBLEM: Manual string ID generation
    if "id" not in form_data:
        timestamp_ms = int(time.time() * 1000)
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        form_data["id"] = f"form_{timestamp_ms}_{random_suffix}"  # Custom string ID
    
    form_id = form_data.pop("id")
    form_data["_id"] = form_id  # Forces custom string as _id
    
    result = await forms_collection.insert_one(form_data)
    # This creates forms with string _id instead of ObjectId

# FIXED CODE (what it should be):
@app.post("/forms")
async def create_form(
    form_data: dict,
    current_device: dict = Depends(get_current_device)
):
    # SOLUTION: Let MongoDB auto-generate ObjectId like visitors
    
    # Remove any client-sent ID - let MongoDB handle _id
    form_data.pop("id", None)  # Remove id if present
    
    # Don't set _id manually - let MongoDB auto-generate ObjectId
    result = await forms_collection.insert_one(form_data)
    
    # Get the created form with proper ObjectId
    new_form = await forms_collection.find_one({"_id": result.inserted_id})
    
    return form_helper(new_form)  # Return form with MongoDB ObjectId

# COMPARISON WITH WORKING VISITOR CODE:
@app.post("/device/visitors", response_model=VisitorResponse)
async def create_visitor_device(
    visitor: VisitorData,
    current_device: dict = Depends(get_current_device)
):
    visitor_dict = visitor.dict()
    # Notice: No _id manipulation - MongoDB auto-generates ObjectId
    result = await visitors_collection.insert_one(visitor_dict)
    
    # Get created visitor with proper ObjectId
    new_visitor = await visitors_collection.find_one({"_id": result.inserted_id})
    return visitor_helper(new_visitor)

# KEY CHANGES NEEDED:
# 1. Remove manual form ID generation (timestamp + random string)
# 2. Don't set form_data["_id"] manually
# 3. Let MongoDB auto-generate ObjectId with insert_one()
# 4. Return the form with proper MongoDB ObjectId

# RESULT:
# Before: _id = "form_1705312345678_abc4" (custom string)
# After:  _id = ObjectId("675b1234567890abcdef1234") (proper MongoDB ObjectId)