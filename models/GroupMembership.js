class GroupMembership {
    static createMembership(groupId, userId, groupDisplay, userDisplay) {
        let membership = {
            "groupId": null,
            "userId": null,
            "groupDisplay": null,
            "userDisplay": null
        };

        membership["groupId"] = groupId;
        membership["userId"] = userId;
        membership["groupDisplay"] = groupDisplay;
        membership["userDisplay"] = userDisplay;

        return membership;
    }
}

module.exports = GroupMembership;